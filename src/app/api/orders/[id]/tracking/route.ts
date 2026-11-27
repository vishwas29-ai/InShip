
import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { authPool } from "@/lib/auth-db";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type UserRow = {
  id: string;
  role: "CUSTOMER" | "AGENT" | "ADMIN";
};

type OrderRow = {
  id: string;
  senderId: string | null;
  receiverId: string | null;
  status: string;
  createdAt: string;
};

export async function GET(
  _request: Request,
  context: RouteContext
) {
  try {
    // 1. Check logged-in user
    const userId = await getSessionUserId();

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Login required" },
        { status: 401 }
      );
    }

    // 2. Get role from database
    const userResult = await authPool.query<UserRow>(
      `SELECT "id", "role"
       FROM "User"
       WHERE "id" = $1
       LIMIT 1`,
      [userId]
    );

    const user = userResult.rows[0];

    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 401 }
      );
    }

    const { id: orderId } = await context.params;

    if (!orderId) {
      return NextResponse.json(
        { success: false, error: "Order ID required" },
        { status: 400 }
      );
    }

    // 3. Find order
    const orderResult = await authPool.query<OrderRow>(
      `SELECT
         "id",
         "senderId",
         "receiverId",
         "status",
         "createdAt"
       FROM "Order"
       WHERE "id" = $1
       LIMIT 1`,
      [orderId]
    );

    const order = orderResult.rows[0];

    if (!order) {
      return NextResponse.json(
        { success: false, error: "Order not found" },
        { status: 404 }
      );
    }

    // 4. Check access
    let hasAccess = false;

    if (user.role === "ADMIN") {
      hasAccess = true;
    } else if (user.role === "CUSTOMER") {
      hasAccess =
        order.senderId === userId ||
        order.receiverId === userId;
    } else if (user.role === "AGENT") {
      const assignmentResult = await authPool.query(
        `SELECT "id"
         FROM "AgentAssignment"
         WHERE "orderId" = $1
           AND "agentId" = $2
         LIMIT 1`,
        [orderId, userId]
      );

      hasAccess = (assignmentResult.rowCount ?? 0) > 0;
    }

    if (!hasAccess) {
      return NextResponse.json(
        {
          success: false,
          error: "You do not have access to this order",
        },
        { status: 403 }
      );
    }

    // 5. Fetch tracking events
    const trackingResult = await authPool.query(
      `SELECT
         "id",
         "orderId",
         "status",
         "description",
         "location",
         "createdAt"
       FROM "TrackingEvent"
       WHERE "orderId" = $1
       ORDER BY "createdAt" ASC, "id" ASC`,
      [orderId]
    );

    return NextResponse.json({
      success: true,
      orderId: order.id,
      currentStatus: order.status,
      events: trackingResult.rows,
    });
  } catch (error) {
    console.error("Tracking API error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Unable to load tracking history",
      },
      { status: 500 }
    );
  }
}
