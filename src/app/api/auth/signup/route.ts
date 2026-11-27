
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { authPool } from "@/lib/auth-db";
import { createSession } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Step 1: Read and clean user input
    const fullName =
      typeof body.fullName === "string"
        ? body.fullName.trim()
        : "";

    const email =
      typeof body.email === "string"
        ? body.email.trim().toLowerCase()
        : "";

    const phone =
      typeof body.phone === "string"
        ? body.phone.trim()
        : "";

    const password = body.password;

    // Step 2: Validate signup details
    if (
      fullName.length < 2 ||
      fullName.length > 100 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      email.length > 254 ||
      !/^[6-9]\d{9}$/.test(phone) ||
      typeof password !== "string" ||
      password.length < 8 ||
      password.length > 128
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Please enter valid account details.",
        },
        { status: 400 }
      );
    }

    // Step 3: Hash password before storing
    const passwordHash = await bcrypt.hash(password, 12);

    // Step 4: Generate unique user ID
    const id = randomUUID();

    // Step 5: Public signup always creates CUSTOMER
    const role = "CUSTOMER" as const;

    await authPool.query(
      `INSERT INTO "User"
       (
         "id",
         "fullName",
         "email",
         "phone",
         "passwordHash",
         "role",
         "createdAt"
       )
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [
        id,
        fullName,
        email,
        phone,
        passwordHash,
        role,
      ]
    );

    // Step 6: Log in newly registered customer
    await createSession(id);

    // Step 7: Return safe user details
    return NextResponse.json(
      {
        success: true,
        user: {
          id,
          fullName,
          email,
          phone,
          role,
        },
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    // Handle duplicate email or phone
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "23505"
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Email or phone already registered.",
        },
        { status: 409 }
      );
    }

    console.error("Signup error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Unable to create account.",
      },
      { status: 500 }
    );
  }
}
