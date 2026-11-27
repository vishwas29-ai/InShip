
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { authPool } from "@/lib/auth-db";
import { createSession } from "@/lib/auth";

type UserRole = "CUSTOMER" | "AGENT" | "ADMIN";

type UserRow = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  passwordHash: string;
  role: UserRole;
};

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const email =
      typeof body.email === "string"
        ? body.email.trim().toLowerCase()
        : "";

    const password = body.password;

    if (
      !email ||
      typeof password !== "string" ||
      !password
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Email and password are required.",
        },
        { status: 400 }
      );
    }

    // Step 1: Fetch user details including role
    const result = await authPool.query<UserRow>(
      `SELECT
        "id",
        "fullName",
        "email",
        "phone",
        "passwordHash",
        "role"
       FROM "User"
       WHERE "email" = $1
       LIMIT 1`,
      [email]
    );

    const user = result.rows[0];

    // Step 2: Verify password
    const validPassword = user
      ? await bcrypt.compare(
          password,
          user.passwordHash
        )
      : false;

    if (!validPassword || !user) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid email or password.",
        },
        { status: 401 }
      );
    }

    // Step 3: Create session
    await createSession(user.id);

    // Step 4: Return user information and role
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Login failed. Please try again.",
      },
      { status: 500 }
    );
  }
}
