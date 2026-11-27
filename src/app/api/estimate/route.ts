
import { NextResponse } from "next/server";

import { calculateDeliveryPrice } from "@/lib/pricing";

import {
  geocodeAddress,
  getRoadDistance,
} from "@/lib/routing";

type BookingRequest = {
  pickupAddress: string;
  pickupPin: string;
  deliveryAddress: string;
  deliveryPin: string;
};

export async function POST(request: Request) {
  let body: unknown;

  // Step 1: Read incoming JSON
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "Invalid JSON request body.",
      },
      { status: 400 }
    );
  }

  // Step 2: Validate request structure
  if (
    typeof body !== "object" ||
    body === null ||
    Array.isArray(body)
  ) {
    return NextResponse.json(
      {
        success: false,
        message: "Invalid booking details.",
      },
      { status: 400 }
    );
  }

  const data = body as Record<string, unknown>;

  const fields = [
    "pickupAddress",
    "pickupPin",
    "deliveryAddress",
    "deliveryPin",
  ];

  for (const field of fields) {
    if (
      typeof data[field] !== "string" ||
      !(data[field] as string).trim()
    ) {
      return NextResponse.json(
        {
          success: false,
          message: `Invalid or missing ${field}.`,
        },
        { status: 400 }
      );
    }
  }

  const booking = data as BookingRequest;

  const pinRegex = /^[1-9][0-9]{5}$/;

  if (
    !pinRegex.test(booking.pickupPin) ||
    !pinRegex.test(booking.deliveryPin)
  ) {
    return NextResponse.json(
      {
        success: false,
        message: "Please provide valid 6-digit Indian PIN codes.",
      },
      { status: 400 }
    );
  }

  try {
    // Step 3: Convert addresses into coordinates
    const [pickupCoordinates, deliveryCoordinates] =
      await Promise.all([
        geocodeAddress(
          booking.pickupAddress,
          booking.pickupPin
        ),
        geocodeAddress(
          booking.deliveryAddress,
          booking.deliveryPin
        ),
      ]);

    // Step 4: Calculate actual road distance
    const distanceKm = await getRoadDistance(
      pickupCoordinates,
      deliveryCoordinates
    );

    // Step 5: Calculate delivery price
    const estimate = calculateDeliveryPrice(distanceKm);

    // Step 6: Return result
    return NextResponse.json({
      success: true,
      pickup: {
        address: booking.pickupAddress,
        pin: booking.pickupPin,
      },
      delivery: {
        address: booking.deliveryAddress,
        pin: booking.deliveryPin,
      },
      ...estimate,
    });

  } catch (error) {
    console.error("Estimate API error:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          "Unable to calculate the route. Please verify both addresses and PIN codes, then try again.",
      },
      { status: 502 }
    );
  }
}
