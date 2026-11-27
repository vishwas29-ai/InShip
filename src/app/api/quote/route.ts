
import { NextResponse } from "next/server";

import {
  geocodePin,
  getRoadDistance,
} from "@/lib/routing";

import { calculateDeliveryPrice } from "@/lib/pricing";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const pickupPin = body?.pickupPin;
    const deliveryPin = body?.deliveryPin;

    const pinRegex = /^[1-9][0-9]{5}$/;

    if (
      typeof pickupPin !== "string" ||
      typeof deliveryPin !== "string" ||
      !pinRegex.test(pickupPin) ||
      !pinRegex.test(deliveryPin)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Enter valid 6-digit Indian PIN codes.",
        },
        { status: 400 }
      );
    }

    // Resolve approximate district coordinates.
    const [pickup, delivery] = await Promise.all([
      geocodePin(pickupPin),
      geocodePin(deliveryPin),
    ]);

    // Calculate driving distance using OpenRouteService.
    const distanceKm = await getRoadDistance(
      pickup,
      delivery
    );

    // Reuse the existing InShip pricing formula.
    const pricing = calculateDeliveryPrice(distanceKm);

    return NextResponse.json({
      success: true,
      pickupPin,
      deliveryPin,
      distanceKm,
      billableKm: pricing.roundedDistance,
      totalCharge: pricing.totalCharge,
    });
  } catch (error) {
    console.error("Quote API failed:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to calculate quote.",
      },
      { status: 500 }
    );
  }
}
