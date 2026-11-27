
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { useRouter } from "next/navigation";

type BookingDetails = {
  pickupAddress: string;
  pickupPin: string;
  deliveryAddress: string;
  deliveryPin: string;
  receiverName: string;
  receiverPhone: string;
  receiverEmail: string;
};

type EstimateResponse = {
  success: true;
  distanceKm: number;
  roundedDistance: number;
  breakdown: {
    first400Charge: number;
    extraCharge: number;
    minimumCharge: number;
  };
  totalCharge: number;
  currency: string;
};

export default function PriceEstimatePage() {
  const router = useRouter();

  const [placingOrder, setPlacingOrder] = useState(false);
  const [orderError, setOrderError] = useState("");

  const [booking, setBooking] =
    useState<BookingDetails | null>(null);

  const [loaded, setLoaded] = useState(false);

  const [estimate, setEstimate] =
    useState<EstimateResponse | null>(null);

  const [calculating, setCalculating] = useState(false);

  const [error, setError] = useState("");

  // 1. Load saved booking from sessionStorage
  useEffect(() => {
    try {
      const savedBooking =
        sessionStorage.getItem("inshipBooking");

      if (savedBooking) {
        const parsed: unknown = JSON.parse(savedBooking);

        if (
          typeof parsed === "object" &&
          parsed !== null &&
          !Array.isArray(parsed)
        ) {
          const data = parsed as Record<string, unknown>;

          if (
            typeof data.pickupAddress === "string" &&
            typeof data.pickupPin === "string" &&
            typeof data.deliveryAddress === "string" &&
            typeof data.deliveryPin === "string" &&
            typeof data.receiverName === "string" &&
            typeof data.receiverPhone === "string" &&
            typeof data.receiverEmail === "string" &&
            data.pickupAddress.trim() &&
            data.deliveryAddress.trim() &&
            /^[1-9]\d{5}$/.test(data.pickupPin) &&
            /^[1-9]\d{5}$/.test(data.deliveryPin) &&
            data.receiverName.trim() &&
            data.receiverName.trim().length <= 100 &&
            /^[6-9]\d{9}$/.test(data.receiverPhone) &&
            (
              !data.receiverEmail.trim() ||
              (
                data.receiverEmail.length <= 254 &&
                /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
                  data.receiverEmail.trim()
                )
              )
            )
          ) {
            setBooking(data as BookingDetails);
          }
        }
      }
    } catch {
      sessionStorage.removeItem("inshipBooking");
    } finally {
      setLoaded(true);
    }
  }, []);

  // 2. Calculate delivery estimate
  useEffect(() => {
    if (!booking) return;

    const controller = new AbortController();

    async function calculateEstimate() {
      if (!booking) return;

      setCalculating(true);
      setError("");
      setEstimate(null);

      try {
        const response = await fetch("/api/estimate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },

          // Only send address details to pricing API
          body: JSON.stringify({
            pickupAddress: booking.pickupAddress,
            pickupPin: booking.pickupPin,
            deliveryAddress: booking.deliveryAddress,
            deliveryPin: booking.deliveryPin,
          }),

          signal: controller.signal,
        });

        const data: unknown = await response.json();

        if (
          !response.ok ||
          typeof data !== "object" ||
          data === null
        ) {
          throw new Error(
            "Unable to calculate delivery estimate."
          );
        }

        const result = data as {
          success?: boolean;
          message?: string;
          distanceKm?: number;
          roundedDistance?: number;
          totalCharge?: number;
          breakdown?: EstimateResponse["breakdown"];
          currency?: string;
        };

        if (
          result.success !== true ||
          typeof result.distanceKm !== "number" ||
          typeof result.roundedDistance !== "number" ||
          typeof result.totalCharge !== "number" ||
          !result.breakdown ||
          typeof result.currency !== "string"
        ) {
          throw new Error(
            result.message ||
              "Invalid estimate received from server."
          );
        }

        setEstimate(result as EstimateResponse);
      } catch (err) {
        if (controller.signal.aborted) return;

        setError(
          err instanceof Error
            ? err.message
            : "Something went wrong."
        );
      } finally {
        if (!controller.signal.aborted) {
          setCalculating(false);
        }
      }
    }

    calculateEstimate();

    return () => controller.abort();
  }, [booking]);

  // 3. Place final order
  async function handlePlaceOrder() {
    if (!booking || !estimate || placingOrder) return;

    setPlacingOrder(true);
    setOrderError("");

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },

        // Send complete booking including receiver details
        body: JSON.stringify({
          pickupAddress: booking.pickupAddress,
          pickupPin: booking.pickupPin,
          deliveryAddress: booking.deliveryAddress,
          deliveryPin: booking.deliveryPin,
          receiverName: booking.receiverName,
          receiverPhone: booking.receiverPhone,
          receiverEmail: booking.receiverEmail,
        }),
      });

      const result = await response.json();

      if (
        !response.ok ||
        !result.success ||
        !result.order?.id
      ) {
        throw new Error(
          result.error || "Unable to place order."
        );
      }

      // Clear booking after successful order creation
      sessionStorage.removeItem("inshipBooking");

      router.push(
        `/orders/success?id=${encodeURIComponent(
          result.order.id
        )}`
      );
    } catch (err) {
      setOrderError(
        err instanceof Error
          ? err.message
          : "Something went wrong while placing your order."
      );
    } finally {
      setPlacingOrder(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#F4FAFA]">
      <Navbar />

      <div className="mx-auto max-w-3xl px-6 py-10">

        {/* Page Heading */}
        <div className="mb-8">
          <p className="mb-2 text-sm font-semibold text-[#00BFAF]">
            STEP 2 OF 3
          </p>

          <h1 className="text-3xl font-bold text-[#142B49]">
            Delivery Price Estimate
          </h1>

          <p className="mt-2 text-gray-600">
            Review your receiver details, delivery information
            and charges.
          </p>
        </div>

        {!loaded ? (
          <div className="rounded-2xl bg-white p-8 text-gray-600">
            Loading booking details...
          </div>
        ) : !booking ? (
          <section className="rounded-2xl bg-white p-8 shadow-sm">

            <h2 className="text-xl font-bold text-[#142B49]">
              No Valid Booking Details Found
            </h2>

            <p className="mt-3 text-gray-600">
              Please complete the booking form with all
              required receiver and delivery details.
            </p>

            <Link
              href="/orders/new"
              className="mt-6 inline-block rounded-lg bg-[#00BFAF] px-6 py-3 font-semibold text-white"
            >
              Book a Delivery
            </Link>

          </section>
        ) : (
          <section className="space-y-6 rounded-2xl bg-white p-6 shadow-sm sm:p-8">

            <h2 className="text-xl font-bold text-[#142B49]">
              Delivery Summary
            </h2>

            {/* Pickup Details */}
            <div className="border-b border-gray-100 pb-5">

              <h3 className="mb-3 font-semibold text-[#142B49]">
                📍 Pickup Details
              </h3>

              <p className="text-sm text-gray-500">
                Pickup Address
              </p>

              <p className="mt-2 whitespace-pre-wrap font-medium text-[#142B49]">
                {booking.pickupAddress}
              </p>

              <p className="mt-1 text-sm text-gray-600">
                PIN: {booking.pickupPin}
              </p>

            </div>

            {/* Receiver Details */}
            <div className="rounded-xl border border-[#BCEAE5] bg-[#F4FAFA] p-5">

              <h3 className="mb-4 font-semibold text-[#142B49]">
                👤 Receiver Details
              </h3>

              <div className="grid gap-4 sm:grid-cols-2">

                <div>
                  <p className="text-sm text-gray-500">
                    Receiver Name
                  </p>

                  <p className="mt-1 break-words font-semibold text-[#142B49]">
                    {booking.receiverName}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-500">
                    Mobile Number
                  </p>

                  <p className="mt-1 font-semibold text-[#142B49]">
                    +91 {booking.receiverPhone}
                  </p>
                </div>

                <div className="sm:col-span-2">
                  <p className="text-sm text-gray-500">
                    Email Address
                  </p>

                  <p className="mt-1 break-all font-medium text-[#142B49]">
                    {booking.receiverEmail || "Not provided"}
                  </p>
                </div>

              </div>
            </div>

            {/* Delivery Details */}
            <div className="border-b border-gray-100 pb-5">

              <h3 className="mb-3 font-semibold text-[#142B49]">
                🚚 Delivery Details
              </h3>

              <p className="text-sm text-gray-500">
                Delivery Address
              </p>

              <p className="mt-2 whitespace-pre-wrap font-medium text-[#142B49]">
                {booking.deliveryAddress}
              </p>

              <p className="mt-1 text-sm text-gray-600">
                PIN: {booking.deliveryPin}
              </p>

            </div>

            {/* Distance */}
            <div className="flex items-center justify-between gap-4">

              <p className="text-gray-600">
                Road Distance
              </p>

              <p className="font-semibold text-[#142B49]">
                {calculating
                  ? "Calculating..."
                  : estimate
                  ? `${estimate.roundedDistance} km`
                  : "Not available"}
              </p>

            </div>

            {/* Price */}
            <div className="flex items-center justify-between gap-4">

              <p className="text-gray-600">
                Delivery Charges
              </p>

              <p className="text-xl font-bold text-[#142B49]">
                {calculating
                  ? "Calculating..."
                  : estimate
                  ? `₹${estimate.totalCharge.toLocaleString(
                      "en-IN"
                    )}`
                  : "Not available"}
              </p>

            </div>

            {/* Loading */}
            {calculating && (
              <div
                role="status"
                className="rounded-lg border border-[#BCEAE5] bg-[#E0F8F7] p-4 text-sm text-[#142B49]"
              >
                Calculating actual road distance and
                delivery charges. Please wait...
              </div>
            )}

            {/* Estimate Error */}
            {error && (
              <div
                role="alert"
                className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
              >
                {error}
              </div>
            )}

            {/* Successful Estimate */}
            {estimate && (
              <div className="rounded-lg border border-[#BCEAE5] bg-[#E0F8F7] p-4 text-sm text-[#142B49]">

                <p className="font-semibold">
                  Estimate calculated successfully!
                </p>

                <p className="mt-2">
                  Actual road distance:{" "}
                  {estimate.distanceKm.toFixed(2)} km
                </p>

                <p className="mt-1">
                  Billable distance:{" "}
                  {estimate.roundedDistance} km
                </p>

                <p className="mt-1">
                  Distance charge (up to 400 km): ₹
                  {estimate.breakdown.first400Charge}
                </p>

                {estimate.breakdown.extraCharge > 0 && (
                  <p className="mt-1">
                    Extra distance charge: ₹
                    {estimate.breakdown.extraCharge}
                  </p>
                )}

                <p className="mt-2 font-bold">
                  Total: ₹{estimate.totalCharge}
                </p>

              </div>
            )}

            {/* Action Buttons */}
            <div className="grid gap-3 sm:grid-cols-2">

              <Link
                href="/orders/new"
                className="rounded-lg border border-[#00BFAF] px-5 py-3 text-center font-semibold text-[#009F93] hover:bg-[#E0F8F7]"
              >
                ← Edit Booking
              </Link>

              <button
                type="button"
                onClick={handlePlaceOrder}
                disabled={
                  !estimate ||
                  calculating ||
                  placingOrder
                }
                className="rounded-lg bg-[#00BFAF] px-5 py-3 font-semibold text-white transition hover:bg-[#009F93] disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-600"
              >
                {placingOrder
                  ? "Placing Order..."
                  : "Place Order →"}
              </button>

            </div>

            {/* Order Error */}
            {orderError && (
              <div
                role="alert"
                className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
              >
                {orderError}
              </div>
            )}

          </section>
        )}
      </div>
    </main>
  );
}
