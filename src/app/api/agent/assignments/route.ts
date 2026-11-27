import { NextResponse } from "next/server";

import { getSessionUserId } from "@/lib/auth";

import { authPool } from "@/lib/auth-db";

export async function GET() {
  try {
    // Check authenticated user

    const userId = await getSessionUserId();

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: "Please login first",
        },
        { status: 401 }
      );
    }

    // Verify agent role

    const userResult = await authPool.query(
      `SELECT "role"
       FROM "User"
       WHERE "id" = $1
       LIMIT 1`,
      [userId]
    );

    if (userResult.rows[0]?.role !== "AGENT") {
      return NextResponse.json(
        {
          success: false,
          error: "Agent access required",
        },
        { status: 403 }
      );
    }

    // Fetch assigned orders

    const result = await authPool.query(
      `SELECT
         a."id",
         a."orderId",
         a."type",
         a."status" AS "assignmentStatus",
         a."assignedAt",
         a."completedAt",

         o."pickupAddress",
         o."pickupPin",

         o."deliveryAddress",
         o."deliveryPin",

         CASE
           WHEN a."type" = 'DELIVERY'
             AND a."status" <> 'CANCELLED'
             AND o."status" <> 'CANCELLED'
           THEN o."receiverName"
           ELSE NULL
         END AS "receiverName",

         CASE
           WHEN a."type" = 'DELIVERY'
             AND a."status" <> 'CANCELLED'
             AND o."status" <> 'CANCELLED'
           THEN o."receiverPhone"
           ELSE NULL
         END AS "receiverPhone",

         o."status" AS "orderStatus"

       FROM "AgentAssignment" a

       JOIN "Order" o
         ON o."id" = a."orderId"

       WHERE a."agentId" = $1

       ORDER BY a."assignedAt" DESC`,

      [userId]
    );

    return NextResponse.json({
      success: true,
      assignments: result.rows,
    });
  } catch (error) {
    console.error(
      "Agent assignments error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Unable to fetch agent assignments",
      },
      { status: 500 }
    );
  }
}