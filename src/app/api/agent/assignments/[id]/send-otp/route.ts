import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";

import { authPool } from "@/lib/auth-db";
import { getSessionUserId } from "@/lib/auth";

import {
  generateOTP,
  hashDeliveryOTP,
} from "@/lib/otp";

import { sendDeliveryOTPEmail } from "@/lib/email";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(
  _request: Request,
  context: RouteContext
) {
  try {
    // ==========================================
    // AUTHENTICATION
    // ==========================================

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

    const { id: assignmentId } = await context.params;

    const client = await authPool.connect();

    let otp = "";
    let receiverEmail = "";
    let orderId = "";
    let verificationId = "";

    try {
      await client.query("BEGIN");

      // ==========================================
      // FIND ASSIGNMENT
      // ==========================================

      const assignmentLookup = await client.query(
        `SELECT "orderId"
         FROM "AgentAssignment"
         WHERE "id" = $1
           AND "agentId" = $2`,
        [assignmentId, userId]
      );

      if (!assignmentLookup.rows[0]) {
        await client.query("ROLLBACK");

        return NextResponse.json(
          {
            success: false,
            error: "Assignment not found",
          },
          { status: 404 }
        );
      }

      orderId = assignmentLookup.rows[0].orderId;

      // Lock order first

      const orderResult = await client.query(
        `SELECT "id", "status", "receiverEmail"
         FROM "Order"
         WHERE "id" = $1
         FOR UPDATE`,
        [orderId]
      );

      const order = orderResult.rows[0];

      const assignmentResult = await client.query(
        `SELECT *
         FROM "AgentAssignment"
         WHERE "id" = $1
           AND "agentId" = $2
           AND "orderId" = $3
         FOR UPDATE`,
        [assignmentId, userId, orderId]
      );

      const assignment = assignmentResult.rows[0];

      if (!order || !assignment) {
        await client.query("ROLLBACK");

        return NextResponse.json(
          {
            success: false,
            error: "Assignment not found",
          },
          { status: 404 }
        );
      }

      // ==========================================
      // VALIDATE DELIVERY ASSIGNMENT
      // ==========================================

      if (
        assignment.type !== "DELIVERY" ||
        assignment.status !== "ASSIGNED" ||
        order.status !== "IN_TRANSIT"
      ) {
        await client.query("ROLLBACK");

        return NextResponse.json(
          {
            success: false,
            error:
              "Delivery OTP is only available for active IN_TRANSIT deliveries",
          },
          { status: 409 }
        );
      }

      const pickupResult = await client.query(
        `SELECT "id"
         FROM "AgentAssignment"
         WHERE "orderId" = $1
           AND "type" = 'PICKUP'
           AND "status" = 'COMPLETED'
         LIMIT 1`,
        [orderId]
      );

      if (pickupResult.rowCount === 0) {
        await client.query("ROLLBACK");

        return NextResponse.json(
          {
            success: false,
            error: "Pickup must be completed first",
          },
          { status: 409 }
        );
      }

      receiverEmail = String(
        order.receiverEmail || ""
      ).trim().toLowerCase();

      if (
        !receiverEmail ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(receiverEmail)
      ) {
        await client.query("ROLLBACK");

        return NextResponse.json(
          {
            success: false,
            error:
              "Receiver email is unavailable. Contact support for delivery verification.",
          },
          { status: 422 }
        );
      }

      // ==========================================
      // CHECK RESEND COOLDOWN
      // ==========================================

      const existingResult = await client.query(
        `SELECT
           "verifiedAt",
           GREATEST(
             0,
             CEIL(
               EXTRACT(
                 EPOCH FROM (
                   "createdAt" + INTERVAL '60 seconds' - NOW()
                 )
               )
             )
           )::int AS "retryAfter"
         FROM "DeliveryVerification"
         WHERE "orderId" = $1
         FOR UPDATE`,
        [orderId]
      );

      const existing = existingResult.rows[0];

      if (existing?.verifiedAt) {
        await client.query("ROLLBACK");

        return NextResponse.json(
          {
            success: false,
            error: "Delivery is already verified",
          },
          { status: 409 }
        );
      }

      if (existing && existing.retryAfter > 0) {
        await client.query("ROLLBACK");

        return NextResponse.json(
          {
            success: false,
            error: "Please wait before requesting another OTP",
            retryAfter: existing.retryAfter,
          },
          { status: 429 }
        );
      }

      // ==========================================
      // GENERATE DELIVERY OTP
      // ==========================================

      otp = generateOTP();

      const otpHash = hashDeliveryOTP(
        otp,
        orderId,
        assignmentId,
        receiverEmail
      );

      verificationId = randomUUID();

      await client.query(
        `INSERT INTO "DeliveryVerification" (
           "id",
           "orderId",
           "otpHash",
           "attempts",
           "expiresAt",
           "verifiedAt",
           "createdAt"
         )
         VALUES (
           $1,
           $2,
           $3,
           0,
           NOW() + INTERVAL '10 minutes',
           NULL,
           NOW()
         )
         ON CONFLICT ("orderId")
         DO UPDATE SET
           "id" = EXCLUDED."id",
           "otpHash" = EXCLUDED."otpHash",
           "attempts" = 0,
           "expiresAt" = EXCLUDED."expiresAt",
           "verifiedAt" = NULL,
           "createdAt" = NOW()`,
        [
          verificationId,
          orderId,
          otpHash,
        ]
      );

      await client.query("COMMIT");

    } catch (error) {
      await client.query("ROLLBACK");
      throw error;

    } finally {
      client.release();
    }

    // ==========================================
    // SEND OTP TO RECEIVER
    // ==========================================

    try {
      await sendDeliveryOTPEmail(
        receiverEmail,
        otp,
        orderId
      );

    } catch {
      // Invalidate only this OTP if sending fails.

      await authPool.query(
        `UPDATE "DeliveryVerification"
         SET "expiresAt" = NOW()
         WHERE "id" = $1
           AND "verifiedAt" IS NULL`,
        [verificationId]
      );

      return NextResponse.json(
        {
          success: false,
          error: "Unable to send delivery email. Please try again after 60 seconds.",
          retryAfter: 60,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Delivery OTP sent to the receiver's email",
      expiresIn: 600,
      retryAfter: 60,
    });

  } catch {
    console.error("Delivery OTP request failed");

    return NextResponse.json(
      {
        success: false,
        error: "Unable to send delivery OTP",
      },
      { status: 500 }
    );
  }
}