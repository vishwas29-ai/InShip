
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    {
      success: true,
      message: "InShip Backend API is running!",
      service: "InShip Delivery Platform",
      status: "healthy",
      timestamp: new Date().toISOString(),
    },
    {
      status: 200,
    }
  );
}
