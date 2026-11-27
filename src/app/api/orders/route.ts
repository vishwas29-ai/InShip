import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { authPool } from "@/lib/auth-db";
import { getSessionUserId } from "@/lib/auth";
import { queueOrderNotifications } from "@/lib/notifications";

import {
  geocodeAddress,
  getRoadDistance,
} from "@/lib/routing";

import { calculateDeliveryPrice } from "@/lib/pricing";

type UserRole = "CUSTOMER" | "AGENT" | "ADMIN";

type UserRow = {
  id: string;
  role: UserRole;
};

type OrderRow = {
  id: string;
  senderId: string | null;
  receiverId: string | null;
  receiverName: string | null;
  receiverPhone: string | null;
  receiverEmail: string | null;
  pickupAddress: string;
  pickupPin: string;
  deliveryAddress: string;
  deliveryPin: string;
  distanceKm: number;
  billableKm: number;
  totalCharge: number;
  status: string;
  createdAt: Date;
};

// ========================================
// GET CURRENT USER
// ========================================

async function getCurrentUser(): Promise<UserRow | null> {
  const userId = await getSessionUserId();

  if (!userId) {
    return null;
  }

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
// GET ORDERS
// ========================================

export async function GET() {
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

    if (user.role === "AGENT") {
      return NextResponse.json(
        {
          success: false,
          error: "Agents cannot access the general orders list",
        },
        { status: 403 }
      );
    }

    let result;

    if (user.role === "ADMIN") {
      result = await authPool.query<OrderRow>(
        `SELECT *
         FROM "Order"
         ORDER BY "createdAt" DESC`
      );
    } else {
      result = await authPool.query<OrderRow>(
        `SELECT *
         FROM "Order"
         WHERE "senderId" = $1
            OR "receiverId" = $1
         ORDER BY "createdAt" DESC`,
        [user.id]
      );
    }

    const orders = result.rows.map((order) => ({
      ...order,
      isSent: order.senderId === user.id,
      isIncoming: order.receiverId === user.id,
    }));

    return NextResponse.json({
      success: true,
      orders,
    });

  } catch (error) {
    console.error("GET orders failed:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch orders",
      },
      { status: 500 }
    );
  }
}

// ========================================
// CREATE NEW ORDER
// ========================================

export async function POST(request: Request) {
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

    if (user.role !== "CUSTOMER") {
      return NextResponse.json(
        {
          success: false,
          error: "Only customers can book parcels",
        },
        { status: 403 }
      );
    }

    // Read request body

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

    if (
      !body ||
      typeof body !== "object" ||
      Array.isArray(body)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request body",
        },
        { status: 400 }
      );
    }

    const data = body as Record<string, unknown>;

    const {
      pickupAddress,
      pickupPin,
      deliveryAddress,
      deliveryPin,
      receiverName,
      receiverPhone,
      receiverEmail,
    } = data;

    // Validate pickup and delivery details

    const pinRegex = /^[1-9][0-9]{5}$/;

    if (
      typeof pickupAddress !== "string" ||
      typeof deliveryAddress !== "string" ||
      !pickupAddress.trim() ||
      !deliveryAddress.trim() ||
      typeof pickupPin !== "string" ||
      typeof deliveryPin !== "string" ||
      !pinRegex.test(pickupPin) ||
      !pinRegex.test(deliveryPin)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid pickup or delivery details",
        },
        { status: 400 }
      );
    }

    // Validate receiver name

    if (
      typeof receiverName !== "string" ||
      !receiverName.trim() ||
      receiverName.trim().length > 100
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Valid receiver name is required",
        },
        { status: 400 }
      );
    }

    // Validate receiver phone

    if (
      typeof receiverPhone !== "string" ||
      !/^[6-9]\d{9}$/.test(receiverPhone)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Valid 10-digit receiver phone is required",
        },
        { status: 400 }
      );
    }

    // Validate optional receiver email

    if (
      receiverEmail !== undefined &&
      receiverEmail !== null &&
      typeof receiverEmail !== "string"
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid receiver email",
        },
        { status: 400 }
      );
    }

    // Normalize input

    const cleanPickupAddress =
      pickupAddress.trim();

    const cleanDeliveryAddress =
      deliveryAddress.trim();

    const cleanReceiverName =
      receiverName.trim();

    const cleanReceiverPhone =
      receiverPhone;

    const cleanReceiverEmail =
      typeof receiverEmail === "string"
        ? receiverEmail.trim().toLowerCase()
        : "";

    const emailRegex =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (
      cleanReceiverEmail &&
      (
        cleanReceiverEmail.length > 254 ||
        !emailRegex.test(cleanReceiverEmail)
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid receiver email address",
        },
        { status: 400 }
      );
    }

    // ========================================
    // GEOCODING
    // ========================================

    const pickup = await geocodeAddress(
      cleanPickupAddress,
      pickupPin
    );

    const delivery = await geocodeAddress(
      cleanDeliveryAddress,
      deliveryPin
    );

    // Calculate road distance

    const distanceKm = await getRoadDistance(
      pickup,
      delivery
    );

    if (
      !Number.isFinite(distanceKm) ||
      distanceKm < 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Unable to calculate delivery distance",
        },
        { status: 422 }
      );
    }

    // Calculate delivery price

    const pricing =
      calculateDeliveryPrice(distanceKm);

    // Generate unique IDs

    const orderId = randomUUID();

    const trackingEventId = randomUUID();

    // Database connection

    const client = await authPool.connect();

    try {

      await client.query("BEGIN");

      // ========================================
      // AUTOMATIC RECEIVER ACCOUNT LINKING
      // ========================================

      let receiverId: string | null = null;

      if (cleanReceiverEmail) {

        const receiverResult = await client.query<{
          id: string;
          emailVerifiedAt: Date | null;
        }>(
          `SELECT "id", "emailVerifiedAt"
           FROM "User"
           WHERE LOWER(TRIM("email")) = $1
             AND "role" = 'CUSTOMER'
           ORDER BY "id"
           FOR UPDATE`,
          [cleanReceiverEmail]
        );

        if (
          receiverResult.rows.length === 1 &&
          receiverResult.rows[0].emailVerifiedAt !== null
        ) {
          receiverId = receiverResult.rows[0].id;
        }
      }

      // ========================================
      // CREATE ORDER
      // ========================================

      const orderResult =
        await client.query<OrderRow>(
          `INSERT INTO "Order" (
             "id",
             "senderId",
             "receiverId",
             "receiverName",
             "receiverPhone",
             "receiverEmail",
             "pickupAddress",
             "pickupPin",
             "deliveryAddress",
             "deliveryPin",
             "distanceKm",
             "billableKm",
             "totalCharge",
             "status",
             "createdAt"
           )
           VALUES (
             $1, $2, $3, $4, $5,
             $6, $7, $8, $9, $10,
             $11, $12, $13, $14, NOW()
           )
           RETURNING *`,
          [
            orderId,
            user.id,
            receiverId,
            cleanReceiverName,
            cleanReceiverPhone,
            cleanReceiverEmail || null,
            cleanPickupAddress,
            pickupPin,
            cleanDeliveryAddress,
            deliveryPin,
            distanceKm,
            pricing.roundedDistance,
            pricing.totalCharge,
            "PLACED",
          ]
        );

      const order = orderResult.rows[0];

      if (!order) {
        throw new Error("Order creation failed");
      }

      // ========================================
      // CREATE INITIAL TRACKING EVENT
      // ========================================

      await client.query(
        `INSERT INTO "TrackingEvent" (
           "id",
           "orderId",
           "updatedById",
           "status",
           "description",
           "location",
           "createdAt"
         )
         VALUES (
           $1, $2, $3, $4, $5, $6, NOW()
         )`,
        [
          trackingEventId,
          order.id,
          user.id,
          "PLACED",
          "Parcel booking successfully created",
          null,
        ]
      );

      // ========================================
      // QUEUE EMAIL NOTIFICATIONS
      // ========================================

      await queueOrderNotifications(
        client,
        order.id,
        "PLACED"
      );

      // ========================================
      // COMMIT TRANSACTION
      // ========================================

      await client.query("COMMIT");

      return NextResponse.json(
        {
          success: true,
          message: "Parcel booked successfully",
          order,
        },
        { status: 201 }
      );

    } catch (error) {

      await client.query("ROLLBACK");

      throw error;

    } finally {

      client.release();

    }

  } catch (error) {

    console.error("POST order failed:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to create order",
      },
      { status: 500 }
    );
  }
}