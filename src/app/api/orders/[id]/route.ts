import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { authPool } from "@/lib/auth-db";
import { getSessionUserId } from "@/lib/auth";
import { queueOrderNotifications } from "@/lib/notifications";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type UserRole = "CUSTOMER" | "AGENT" | "ADMIN";

type UserRow = {
  id: string;
  role: UserRole;
};

type OrderRow = {
  id: string;
  status: string;
};

const validStatuses = [
  "PLACED",
  "ACCEPTED",
  "IN_TRANSIT",
  "COMPLETED",
  "CANCELLED",
] as const;

type OrderStatus =
  (typeof validStatuses)[number];

// ========================================
// GET CURRENT USER
// ========================================

async function getCurrentUser(): Promise<UserRow | null> {

  const userId = await getSessionUserId();

  if (!userId) return null;

  const result = await authPool.query<UserRow>(
    `SELECT "id", "role"
     FROM "User"
     WHERE "id" = $1
     LIMIT 1`,
    [userId]
  );

  return result.rows[0] ?? null;
}

// ========================================
// GET ONE ORDER
// ========================================

export async function GET(
  _request: Request,
  context: RouteContext
) {
  try {

    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "Please login first",
        },
        { status: 401 }
      );
    }

    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid order ID",
        },
        { status: 400 }
      );
    }

    // Role-based access rules

    const result = await authPool.query(
      `SELECT o.*
       FROM "Order" o
       WHERE o."id" = $1
         AND (
           $2 = 'ADMIN'

           OR (
             $2 = 'CUSTOMER'
             AND (
               o."senderId" = $3
               OR o."receiverId" = $3
             )
           )

           OR (
             $2 = 'AGENT'
             AND EXISTS (
               SELECT 1
               FROM "AgentAssignment" a
               WHERE a."orderId" = o."id"
                 AND a."agentId" = $3
                 AND a."status" <> 'CANCELLED'
             )
           )
         )
       LIMIT 1`,
      [id, user.role, user.id]
    );

    const order = result.rows[0];

    if (!order) {
      return NextResponse.json(
        {
          success: false,
          error: "Order not found or access denied",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      order,
    });

  } catch (error) {

    console.error("GET order failed:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch order",
      },
      { status: 500 }
    );
  }
}

// ========================================
// UPDATE ORDER STATUS - ADMIN ONLY
// ========================================

export async function PATCH(
  request: Request,
  context: RouteContext
) {
  try {

    // Authentication

    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "Please login first",
        },
        { status: 401 }
      );
    }

    // Authorization

    if (user.role !== "ADMIN") {
      return NextResponse.json(
        {
          success: false,
          error: "Admin access required",
        },
        { status: 403 }
      );
    }

    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid order ID",
        },
        { status: 400 }
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

    const requestedStatus =
      body !== null &&
      typeof body === "object" &&
      "status" in body
        ? body.status
        : undefined;

    if (
      typeof requestedStatus !== "string" ||
      !validStatuses.includes(
        requestedStatus as OrderStatus
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid status",
        },
        { status: 400 }
      );
    }

    const newStatus =
      requestedStatus as OrderStatus;

    const client = await authPool.connect();

    try {

      await client.query("BEGIN");

      // ========================================
      // LOCK ORDER
      // ========================================

      const orderResult =
        await client.query<OrderRow>(
          `SELECT *
           FROM "Order"
           WHERE "id" = $1
           FOR UPDATE`,
          [id]
        );

      const currentOrder =
        orderResult.rows[0];

      if (!currentOrder) {

        await client.query("ROLLBACK");

        return NextResponse.json(
          {
            success: false,
            error: "Order not found",
          },
          { status: 404 }
        );
      }

      const oldStatus =
        currentOrder.status;

      // Avoid duplicate tracking and notifications

      if (oldStatus === newStatus) {

        await client.query("ROLLBACK");

        return NextResponse.json({
          success: true,
          message: "Order already has this status",
          order: currentOrder,
          unchanged: true,
        });
      }

      // ========================================
      // VALIDATE ADMIN TRANSITIONS
      // ========================================

      const isDispatch =
        oldStatus === "ACCEPTED" &&
        newStatus === "IN_TRANSIT";

      const isCancellation =
        (
          oldStatus === "PLACED" ||
          oldStatus === "ACCEPTED"
        ) &&
        newStatus === "CANCELLED";

      if (!isDispatch && !isCancellation) {

        await client.query("ROLLBACK");

        return NextResponse.json(
          {
            success: false,
            error:
              `Invalid status transition: ${oldStatus} → ${newStatus}. ` +
              "Admin can dispatch accepted orders or cancel eligible orders.",
          },
          { status: 409 }
        );
      }

      // ========================================
      // VERIFY PICKUP BEFORE DISPATCH
      // ========================================

      if (isDispatch) {

        const pickupResult = await client.query(
          `SELECT "id"
           FROM "AgentAssignment"
           WHERE "orderId" = $1
             AND "type" = 'PICKUP'
             AND "status" = 'COMPLETED'
           LIMIT 1`,
          [id]
        );

        if ((pickupResult.rowCount ?? 0) === 0) {

          await client.query("ROLLBACK");

          return NextResponse.json(
            {
              success: false,
              error:
                "Pickup Agent must complete pickup before dispatch.",
            },
            { status: 409 }
          );
        }
      }

      // ========================================
      // UPDATE ORDER STATUS
      // ========================================

      const updateResult = await client.query(
        `UPDATE "Order"
         SET "status" = $1
         WHERE "id" = $2
         RETURNING *`,
        [newStatus, id]
      );

      // ========================================
      // CANCEL PENDING ASSIGNMENTS
      // ========================================

      let cancelledAssignments = 0;

      if (isCancellation) {

        const cancellationResult =
          await client.query(
            `UPDATE "AgentAssignment"
             SET "status" = 'CANCELLED'
             WHERE "orderId" = $1
               AND "status" = 'ASSIGNED'
             RETURNING "id"`,
            [id]
          );

        cancelledAssignments =
          cancellationResult.rowCount ?? 0;
      }

      // ========================================
      // TRACKING EVENT
      // ========================================

      const description =
        newStatus === "IN_TRANSIT"
          ? "Parcel dispatched and is now in transit"
          : "Order cancelled by administrator";

      await client.query(
        `INSERT INTO "TrackingEvent" (
           "id",
           "orderId",
           "updatedById",
           "status",
           "description",
           "location"
         )
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          randomUUID(),
          id,
          user.id,
          newStatus,
          description,
          null,
        ]
      );

      // ========================================
      // QUEUE EMAIL NOTIFICATIONS
      // ========================================

      await queueOrderNotifications(
        client,
        id,
        newStatus
      );

      // ========================================
      // COMMIT ALL CHANGES
      // ========================================

      await client.query("COMMIT");

      return NextResponse.json({
        success: true,

        message:
          newStatus === "IN_TRANSIT"
            ? "Parcel dispatched successfully"
            : `Order cancelled successfully. ${cancelledAssignments} pending assignment(s) cancelled.`,

        order: updateResult.rows[0],

        cancelledAssignments,
      });

    } catch (error) {

      await client.query("ROLLBACK");

      throw error;

    } finally {

      client.release();

    }

  } catch (error) {

    console.error("PATCH order failed:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to update order status",
      },
      { status: 500 }
    );
  }
}