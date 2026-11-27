import { NextResponse } from "next/server";

import { authPool } from "@/lib/auth-db";
import { getSessionUserId } from "@/lib/auth";
import { verifyOTP } from "@/lib/otp";

export async function POST(request: Request) {
  try {
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

    const body = await request.json().catch(() => null);
    const otp = body?.otp;

    if (
      typeof otp !== "string" ||
      !/^\d{6}$/.test(otp)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Enter a valid 6-digit OTP",
        },
        { status: 400 }
      );
    }

    const client = await authPool.connect();

    try {
      await client.query("BEGIN");

      const userResult = await client.query(
        `SELECT "id", "email", "role"
         FROM "User"
         WHERE "id" = $1
         FOR UPDATE`,
        [userId]
      );

      const user = userResult.rows[0];

      if (!user || user.role !== "CUSTOMER") {
        await client.query("ROLLBACK");

        return NextResponse.json(
          {
            success: false,
            error: "Customer access required",
          },
          { status: 403 }
        );
      }

      const email = user.email.trim().toLowerCase();

      const verificationResult = await client.query(
        `SELECT *
         FROM "EmailVerification"
         WHERE "userId" = $1
         FOR UPDATE`,
        [userId]
      );

      const verification =
        verificationResult.rows[0];

      if (
        !verification ||
        verification.verifiedAt ||
        verification.email !== email
      ) {
        await client.query("ROLLBACK");

        return NextResponse.json(
          {
            success: false,
            error: "Please request a new OTP",
          },
          { status: 400 }
        );
      }

      if (
        new Date(verification.expiresAt).getTime() <=
        Date.now()
      ) {
        await client.query("ROLLBACK");

        return NextResponse.json(
          {
            success: false,
            error: "OTP expired. Request a new OTP.",
          },
          { status: 400 }
        );
      }

      if (verification.attempts >= 5) {
        await client.query("ROLLBACK");

        return NextResponse.json(
          {
            success: false,
            error: "Maximum attempts exceeded. Request a new OTP.",
          },
          { status: 429 }
        );
      }

      const valid = verifyOTP(
        otp,
        userId,
        email,
        verification.otpHash
      );

      if (!valid) {
        await client.query(
          `UPDATE "EmailVerification"
           SET "attempts" = "attempts" + 1
           WHERE "userId" = $1`,
          [userId]
        );

        await client.query("COMMIT");

        return NextResponse.json(
          {
            success: false,
            error: "Incorrect OTP",
            remainingAttempts:
              Math.max(0, 4 - verification.attempts),
          },
          { status: 400 }
        );
      }

      // Mark user email as verified

      await client.query(
        `UPDATE "User"
         SET "emailVerifiedAt" = NOW()
         WHERE "id" = $1`,
        [userId]
      );

      // Mark OTP as used

      await client.query(
        `UPDATE "EmailVerification"
         SET "verifiedAt" = NOW()
         WHERE "userId" = $1`,
        [userId]
      );

      // Link matching unclaimed parcels

      const linkedOrders = await client.query(
        `UPDATE "Order"
         SET "receiverId" = $1
         WHERE "receiverId" IS NULL
           AND LOWER(TRIM("receiverEmail")) = $2
           AND "status" <> 'CANCELLED'
         RETURNING "id"`,
        [userId, email]
      );

      await client.query("COMMIT");

      return NextResponse.json({
        success: true,
        message: "Email verified successfully",
        linkedOrders: linkedOrders.rowCount ?? 0,
      });

    } catch (error) {
      await client.query("ROLLBACK");
      throw error;

    } finally {
      client.release();
    }

  } catch (error) {
    console.error("Verify OTP failed:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Unable to verify OTP",
      },
      { status: 500 }
    );
  }
}