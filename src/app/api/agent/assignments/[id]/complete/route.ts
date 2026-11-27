import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getSessionUserId } from "@/lib/auth";
import { authPool } from "@/lib/auth-db";
import { verifyDeliveryOTP } from "@/lib/otp";
import { queueOrderNotifications } from "@/lib/notifications";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {

    // ========================================
    // AUTHENTICATION
    // ========================================

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

    // ========================================
    // VERIFY AGENT ROLE
    // ========================================

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

    const { id: assignmentId } =
      await context.params;

    // ========================================
    // READ OTP
    // ========================================

    let otp = "";

    const rawBody = await request.text();

    if (rawBody.trim()) {

      try {

        const body = JSON.parse(rawBody);

        if (
          !body ||
          typeof body !== "object" ||
          Array.isArray(body)
        ) {
          throw new Error("Invalid body");
        }

        if (typeof body.otp === "string") {
          otp = body.otp.trim();
        }

      } catch {

        return NextResponse.json(
          {
            success: false,
            error: "Invalid request body",
          },
          { status: 400 }
        );
      }
    }

    const client = await authPool.connect();

    try {

      await client.query("BEGIN");

      // ========================================
      // FIND ASSIGNMENT
      // ========================================

      const lookupResult = await client.query(
        `SELECT "orderId"
         FROM "AgentAssignment"
         WHERE "id" = $1
           AND "agentId" = $2`,
        [assignmentId, userId]
      );

      if (!lookupResult.rows[0]) {

        await client.query("ROLLBACK");

        return NextResponse.json(
          {
            success: false,
            error: "Assignment not found",
          },
          { status: 404 }
        );
      }

      const orderId =
        lookupResult.rows[0].orderId;

      // ========================================
      // LOCK ORDER FIRST
      // ========================================

      const orderResult = await client.query(
        `SELECT *
         FROM "Order"
         WHERE "id" = $1
         FOR UPDATE`,
        [orderId]
      );

      const order = orderResult.rows[0];

      // ========================================
      // LOCK ASSIGNMENT
      // ========================================

      const assignmentResult =
        await client.query(
          `SELECT *
           FROM "AgentAssignment"
           WHERE "id" = $1
             AND "agentId" = $2
             AND "orderId" = $3
           FOR UPDATE`,
          [
            assignmentId,
            userId,
            orderId,
          ]
        );

      const assignment =
        assignmentResult.rows[0];

      if (!assignment || !order) {

        await client.query("ROLLBACK");

        return NextResponse.json(
          {
            success: false,
            error: "Assignment not found",
          },
          { status: 404 }
        );
      }

      // Prevent duplicate completion

      if (assignment.status !== "ASSIGNED") {

        await client.query("ROLLBACK");

        return NextResponse.json(
          {
            success: false,
            error:
              "Assignment is not pending completion",
          },
          { status: 409 }
        );
      }

      let newOrderStatus: string;

      let description: string;

      let location: string;

      // ========================================
      // PICKUP COMPLETION
      // ========================================

      if (assignment.type === "PICKUP") {

        if (order.status !== "PLACED") {

          await client.query("ROLLBACK");

          return NextResponse.json(
            {
              success: false,
              error:
                "Pickup requires a PLACED order",
            },
            { status: 409 }
          );
        }

        newOrderStatus = "ACCEPTED";

        description =
          "Parcel picked up by pickup agent";

        location = order.pickupAddress;

      // ========================================
      // DELIVERY COMPLETION
      // ========================================

      } else if (assignment.type === "DELIVERY") {

        if (order.status !== "IN_TRANSIT") {

          await client.query("ROLLBACK");

          return NextResponse.json(
            {
              success: false,
              error:
                "Delivery requires an IN_TRANSIT order",
            },
            { status: 409 }
          );
        }

        // Verify pickup completion

        const pickupResult =
          await client.query(
            `SELECT "id"
             FROM "AgentAssignment"
             WHERE "orderId" = $1
               AND "type" = 'PICKUP'
               AND "status" = 'COMPLETED'
             LIMIT 1`,
            [orderId]
          );

        if ((pickupResult.rowCount ?? 0) === 0) {

          await client.query("ROLLBACK");

          return NextResponse.json(
            {
              success: false,
              error:
                "Pickup must be completed first",
            },
            { status: 409 }
          );
        }

        // ========================================
        // OTP VALIDATION
        // ========================================

        if (!/^\d{6}$/.test(otp)) {

          await client.query("ROLLBACK");

          return NextResponse.json(
            {
              success: false,
              error:
                "A valid 6-digit delivery OTP is required",
            },
            { status: 400 }
          );
        }

        const verificationResult =
          await client.query(
            `SELECT
               *,
               (
                 "expiresAt" <= clock_timestamp()
               ) AS "isExpired"
             FROM "DeliveryVerification"
             WHERE "orderId" = $1
             FOR UPDATE`,
            [orderId]
          );

        const verification =
          verificationResult.rows[0];

        // Check whether OTP exists

        if (!verification) {

          await client.query("ROLLBACK");

          return NextResponse.json(
            {
              success: false,
              error:
                "Please request a delivery OTP first",
            },
            { status: 400 }
          );
        }

        // Prevent OTP reuse

        if (verification.verifiedAt) {

          await client.query("ROLLBACK");

          return NextResponse.json(
            {
              success: false,
              error:
                "This OTP has already been used",
            },
            { status: 409 }
          );
        }

        // Check OTP expiration

        if (verification.isExpired) {

          await client.query("ROLLBACK");

          return NextResponse.json(
            {
              success: false,
              error:
                "OTP expired. Please request a new OTP",
            },
            { status: 400 }
          );
        }

        // Check maximum attempts

        if (verification.attempts >= 5) {

          await client.query("ROLLBACK");

          return NextResponse.json(
            {
              success: false,
              error:
                "Maximum OTP attempts exceeded. Request a new OTP",
              remainingAttempts: 0,
            },
            { status: 429 }
          );
        }

        // Receiver email

        const receiverEmail = String(
          order.receiverEmail || ""
        )
          .trim()
          .toLowerCase();

        if (!receiverEmail) {

          await client.query("ROLLBACK");

          return NextResponse.json(
            {
              success: false,
              error:
                "Receiver email is unavailable",
            },
            { status: 422 }
          );
        }

        // ========================================
        // VERIFY OTP HASH
        // ========================================

        const validOTP = verifyDeliveryOTP(
          otp,
          orderId,
          assignmentId,
          receiverEmail,
          verification.otpHash
        );

        // ========================================
        // WRONG OTP
        // ========================================

        if (!validOTP) {

          await client.query(
            `UPDATE "DeliveryVerification"
             SET "attempts" = "attempts" + 1
             WHERE "orderId" = $1`,
            [orderId]
          );

          // Save incorrect attempts.
          // Do not generate notifications here.

          await client.query("COMMIT");

          const remainingAttempts = Math.max(
            0,
            5 - Number(verification.attempts) - 1
          );

          return NextResponse.json(
            {
              success: false,
              error: "Incorrect delivery OTP",
              remainingAttempts,
            },
            { status: 400 }
          );
        }

        // ========================================
        // CORRECT OTP
        // ========================================

        await client.query(
          `UPDATE "DeliveryVerification"
           SET "verifiedAt" = NOW()
           WHERE "orderId" = $1`,
          [orderId]
        );

        newOrderStatus = "COMPLETED";

        description =
          "Parcel delivered successfully after OTP verification";

        location = order.deliveryAddress;

      } else {

        await client.query("ROLLBACK");

        return NextResponse.json(
          {
            success: false,
            error: "Invalid assignment type",
          },
          { status: 400 }
        );
      }

      // ========================================
      // COMPLETE ASSIGNMENT
      // ========================================

      const completedResult =
        await client.query(
          `UPDATE "AgentAssignment"
           SET
             "status" = 'COMPLETED',
             "completedAt" = NOW()
           WHERE "id" = $1
           RETURNING *`,
          [assignmentId]
        );

      // ========================================
      // UPDATE ORDER STATUS
      // ========================================

      await client.query(
        `UPDATE "Order"
         SET "status" = $1
         WHERE "id" = $2`,
        [
          newOrderStatus,
          orderId,
        ]
      );

      // ========================================
      // SAVE TRACKING HISTORY
      // ========================================

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
          orderId,
          userId,
          newOrderStatus,
          description,
          location,
        ]
      );

      // ========================================
      // QUEUE EMAIL NOTIFICATIONS
      // ========================================

      await queueOrderNotifications(
        client,
        orderId,
        newOrderStatus
      );

      // ========================================
      // COMMIT ALL CHANGES
      // ========================================

      await client.query("COMMIT");

      return NextResponse.json({

        success: true,

        message:
          assignment.type === "PICKUP"
            ? "Pickup completed successfully"
            : "OTP verified. Parcel delivered successfully!",

        assignment:
          completedResult.rows[0],

        orderStatus:
          newOrderStatus,

      });

    } catch (error) {

      await client.query("ROLLBACK");

      throw error;

    } finally {

      client.release();

    }

  } catch {

    console.error("Complete assignment failed");

    return NextResponse.json(
      {
        success: false,
        error: "Unable to complete assignment",
      },
      { status: 500 }
    );
  }
}