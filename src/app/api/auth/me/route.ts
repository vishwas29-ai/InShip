import { NextResponse } from "next/server";
import { authPool } from "@/lib/auth-db";
import { getSessionUserId } from "@/lib/auth";

type UserRole = "CUSTOMER" | "AGENT" | "ADMIN";

type UserRow = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: UserRole;
  emailVerifiedAt: Date | null;
};

export async function GET() {
  try {
    const userId = await getSessionUserId();

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          user: null,
        },
        { status: 401 }
      );
    }

    const result = await authPool.query<UserRow>(
      `SELECT
         "id",
         "fullName",
         "email",
         "phone",
         "role",
         "emailVerifiedAt"
       FROM "User"
       WHERE "id" = $1
       LIMIT 1`,
      [userId]
    );

    const user = result.rows[0];

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          user: null,
        },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        user: {
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          phone: user.phone,
          role: user.role,
          emailVerifiedAt: user.emailVerifiedAt,
          emailVerified: user.emailVerifiedAt !== null,
        },
      },
      {
        headers: {
          "Cache-Control": "private, no-store",
        },
      }
    );

  } catch (error) {
    console.error("Current user error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Unable to load user.",
      },
      { status: 500 }
    );
  }
}