import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getSessionUserId } from "@/lib/auth";
import { authPool } from "@/lib/auth-db";
import { queueOrderNotifications } from "@/lib/notifications";

type UserRow = {
  id: string;
  role: string;
};

type OrderRow = {
  id: string;
  status: string;
};

type AssignmentType =
  "PICKUP" | "DELIVERY";

// ========================================
// VERIFY ADMIN
// ========================================

async function requireAdmin() {

  const userId = await getSessionUserId();

  if (!userId) return false;

  const result = await authPool.query<UserRow>(
    `SELECT "id", "role"
     FROM "User"
     WHERE "id" = $1
     LIMIT 1`,
    [userId]
  );

  return result.rows[0]?.role === "ADMIN";
}

// ========================================
// GET AGENTS AND ASSIGNMENTS
// ========================================

export async function GET() {
  try {

    if (!(await requireAdmin())) {
      return NextResponse.json(
        {
          success: false,
          error: "Admin access required",
        },
        { status: 403 }
      );
    }

    const agentsResult = await authPool.query(
      `SELECT
         "id",
         "fullName",
         "email",
         "phone"
       FROM "User"
       WHERE "role" = 'AGENT'
       ORDER BY "fullName" ASC`
    );

    const assignmentsResult =
      await authPool.query(
        `SELECT
           a."id",
           a."orderId",
           a."agentId",
           a."type",
           a."status",
           a."assignedAt",
           u."fullName" AS "agentName"
         FROM "AgentAssignment" a
         JOIN "User" u
           ON u."id" = a."agentId"
         ORDER BY a."assignedAt" DESC`
      );

    return NextResponse.json({
      success: true,
      agents: agentsResult.rows,
      assignments: assignmentsResult.rows,
    });

  } catch (error) {

    console.error("Fetch agents error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch agents",
      },
      { status: 500 }
    );
  }
}

// ========================================
// ASSIGN AGENT TO ORDER
// ========================================

export async function POST(
  request: NextRequest
) {
  try {

    // Admin authorization

    if (!(await requireAdmin())) {

      return NextResponse.json(
        {
          success: false,
          error: "Admin access required",
        },
        { status: 403 }
      );
    }

    // Validate request body

    let body: unknown;

    try {

      body = await request.json();

    } catch {

      return NextResponse.json(
        {
          success: false,
          error: "Invalid JSON body",
        },
        { status: 400 }
      );
    }

    if (
      !body ||
      typeof body !== "object" ||
      Array.isArray(body)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request body",
        },
        { status: 400 }
      );
    }

    const data =
      body as Record<string, unknown>;

    const {
      orderId,
      agentId,
      type,
    } = data;

    if (
      typeof orderId !== "string" ||
      !orderId.trim() ||
      typeof agentId !== "string" ||
      !agentId.trim()
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Order ID and Agent ID are required",
        },
        { status: 400 }
      );
    }

    if (
      type !== "PICKUP" &&
      type !== "DELIVERY"
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid assignment type",
        },
        { status: 400 }
      );
    }

    const assignmentType: AssignmentType =
      type;

    const client = await authPool.connect();

    try {

      await client.query("BEGIN");

      // ========================================
      // LOCK ORDER
      // ========================================

      const orderResult =
        await client.query<OrderRow>(
          `SELECT "id", "status"
           FROM "Order"
           WHERE "id" = $1
           FOR UPDATE`,
          [orderId]
        );

      const order = orderResult.rows[0];

      if (!order) {

        await client.query("ROLLBACK");

        return NextResponse.json(
          {
            success: false,
            error: "Order not found",
          },
          { status: 404 }
        );
      }

      // ========================================
      // BLOCK CLOSED ORDERS
      // ========================================

      if (
        order.status === "COMPLETED" ||
        order.status === "CANCELLED"
      ) {
        await client.query("ROLLBACK");

        return NextResponse.json(
          {
            success: false,
            error:
              `Cannot assign agents to a ${order.status} order`,
          },
          { status: 409 }
        );
      }

      // ========================================
      // VALIDATE PICKUP ASSIGNMENT
      // ========================================

      if (
        assignmentType === "PICKUP" &&
        order.status !== "PLACED"
      ) {
        await client.query("ROLLBACK");

        return NextResponse.json(
          {
            success: false,
            error:
              "Pickup Agent can only be assigned when order status is PLACED",
          },
          { status: 409 }
        );
      }

      // ========================================
      // VALIDATE DELIVERY ASSIGNMENT
      // ========================================

      if (
        assignmentType === "DELIVERY" &&
        ![
          "PLACED",
          "ACCEPTED",
          "IN_TRANSIT",
        ].includes(order.status)
      ) {
        await client.query("ROLLBACK");

        return NextResponse.json(
          {
            success: false,
            error:
              "Delivery Agent cannot be assigned at the current order status",
          },
          { status: 409 }
        );
      }

      // ========================================
      // VERIFY AGENT
      // ========================================

      const agentResult = await client.query(
        `SELECT "id"
         FROM "User"
         WHERE "id" = $1
           AND "role" = 'AGENT'`,
        [agentId]
      );

      if (agentResult.rows.length === 0) {

        await client.query("ROLLBACK");

        return NextResponse.json(
          {
            success: false,
            error: "Valid agent not found",
          },
          { status: 404 }
        );
      }

      // ========================================
      // PREVENT DUPLICATE ASSIGNMENT
      // ========================================

      const existingResult =
        await client.query(
          `SELECT "id"
           FROM "AgentAssignment"
           WHERE "orderId" = $1
             AND "type" = $2
           LIMIT 1`,
          [orderId, assignmentType]
        );

      if (existingResult.rows.length > 0) {

        await client.query("ROLLBACK");

        return NextResponse.json(
          {
            success: false,
            error:
              `${assignmentType} agent already assigned to this order`,
          },
          { status: 409 }
        );
      }

      // ========================================
      // CREATE ASSIGNMENT
      // ========================================

      const assignmentId = randomUUID();

      const result = await client.query(
        `INSERT INTO "AgentAssignment" (
           "id",
           "orderId",
           "agentId",
           "type",
           "status"
         )
         VALUES (
           $1, $2, $3, $4, 'ASSIGNED'
         )
         RETURNING *`,
        [
          assignmentId,
          orderId,
          agentId,
          assignmentType,
        ]
      );

      // ========================================
      // QUEUE EMAIL NOTIFICATIONS
      // ========================================

      await queueOrderNotifications(
        client,
        orderId,
        assignmentType === "PICKUP"
          ? "PICKUP_ASSIGNED"
          : "DELIVERY_ASSIGNED"
      );

      // ========================================
      // COMMIT TRANSACTION
      // ========================================

      await client.query("COMMIT");

      return NextResponse.json(
        {
          success: true,
          message:
            `${assignmentType} agent assigned successfully`,
          assignment: result.rows[0],
        },
        { status: 201 }
      );

    } catch (error) {

      await client.query("ROLLBACK");

      throw error;

    } finally {

      client.release();

    }

  } catch (error) {

    console.error("Assign agent error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to assign agent",
      },
      { status: 500 }
    );
  }
}