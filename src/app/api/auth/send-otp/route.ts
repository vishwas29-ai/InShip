import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";

import { authPool } from "@/lib/auth-db";
import { getSessionUserId } from "@/lib/auth";

import { generateOTP, hashOTP } from "@/lib/otp";
import { sendVerificationEmail } from "@/lib/email";

export async function POST() {
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

    const client = await authPool.connect();

    let email = "";
    let otp = "";

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

      email = user.email.trim().toLowerCase();

      const existingResult = await client.query(
        `SELECT "createdAt"
         FROM "EmailVerification"
         WHERE "userId" = $1`,
        [userId]
      );

      const existing = existingResult.rows[0];

      if (existing) {
        const elapsedSeconds =
          (Date.now() -
            new Date(existing.createdAt).getTime()) /
          1000;

        if (elapsedSeconds < 60) {
          await client.query("ROLLBACK");

          return NextResponse.json(
            {
              success: false,
              error: "Please wait before requesting another OTP",
              retryAfter: Math.ceil(60 - elapsedSeconds),
            },
            { status: 429 }
          );
        }
      }

      otp = generateOTP();

      const otpHash = hashOTP(
        otp,
        userId,
        email
      );

      await client.query(
        `INSERT INTO "EmailVerification" (
          "id",
          "userId",
          "email",
          "otpHash",
          "attempts",
          "expiresAt",
          "verifiedAt",
          "createdAt"
        )
        VALUES (
          $1, $2, $3, $4, 0,
          NOW() + INTERVAL '5 minutes',
          NULL,
          NOW()
        )
        ON CONFLICT ("userId")
        DO UPDATE SET
          "email" = EXCLUDED."email",
          "otpHash" = EXCLUDED."otpHash",
          "attempts" = 0,
          "expiresAt" = EXCLUDED."expiresAt",
          "verifiedAt" = NULL,
          "createdAt" = NOW()`,
        [
          randomUUID(),
          userId,
          email,
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

    await sendVerificationEmail(email, otp);

    return NextResponse.json({
      success: true,
      message: "Verification OTP sent successfully",
      email,
      expiresIn: 300,
      retryAfter: 60,
    });

  } catch (error) {
    console.error("Send OTP failed:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Unable to send verification email. Please try again later.",
      },
      { status: 500 }
    );
  }
}