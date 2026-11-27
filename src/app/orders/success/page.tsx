
"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Navbar from "@/components/Navbar";

type Order = {
  id: string;
  pickupAddress: string;
  pickupPin: string;
  deliveryAddress: string;
  deliveryPin: string;
  billableKm: number;
  totalCharge: number;
  status: string;
  createdAt: string;
};

function OrderSuccessContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("id");

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(Boolean(orderId));
  const [error, setError] = useState("");

  useEffect(() => {
    if (!orderId) return;

    let cancelled = false;

    async function fetchOrder() {
      try {
        const response = await fetch(
          `/api/orders/${encodeURIComponent(orderId!)}`,
          { cache: "no-store" }
        );

        if (!response.ok) {
          throw new Error("Unable to load booking details");
        }

        const data = await response.json();

        if (!data.success || !data.order) {
          throw new Error("Order details unavailable");
        }

        if (!cancelled) {
          setOrder(data.order);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load booking details"
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void fetchOrder();

    return () => {
      cancelled = true;
    };
  }, [orderId]);

  return (
    <main className="min-h-screen bg-[#F4FAFA]">
      <Navbar />

      <div className="mx-auto max-w-3xl px-5 py-12 sm:py-16">
        <section className="overflow-hidden rounded-3xl bg-white shadow-lg">
          {/* SUCCESS HEADER */}
          <div className="bg-gradient-to-br from-[#E0F8F7] to-white px-6 py-10 text-center sm:px-10">
            <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-[#00BFAF] text-4xl font-bold text-white shadow-md">
              ✓
            </div>

            <h1 className="text-3xl font-bold text-[#142B49]">
              {orderId
                ? "Order Placed Successfully!"
                : "Order Details Unavailable"}
            </h1>

            <p className="mx-auto mt-3 max-w-md text-gray-600">
              {orderId
                ? "Your delivery booking has been confirmed and saved successfully."
                : "No order ID was provided. Please check your orders."}
            </p>

            {orderId && (
              <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#008F84] shadow-sm">
                <span className="h-2 w-2 rounded-full bg-[#00BFAF]" />
                Booking Confirmation
              </div>
            )}
          </div>

          <div className="px-6 pb-10 sm:px-10">
            {/* ORDER ID */}
            {orderId && (
              <div className="mt-6 rounded-2xl border border-[#BCEAE5] bg-[#F4FAFA] p-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Your Order ID
                </p>

                <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                  <p className="break-all font-mono text-sm font-bold text-[#142B49]">
                    {orderId}
                  </p>

                  <button
                    type="button"
                    onClick={() =>
                      void navigator.clipboard.writeText(orderId)
                    }
                    className="rounded-lg border border-[#00BFAF] px-3 py-2 text-xs font-semibold text-[#008F84] hover:bg-[#E0F8F7]"
                  >
                    Copy ID
                  </button>
                </div>

                <p className="mt-3 text-sm text-gray-500">
                  Keep this ID for tracking your delivery.
                </p>
              </div>
            )}

            {/* LOADING */}
            {loading && (
              <div className="py-10 text-center text-gray-500">
                Loading booking details...
              </div>
            )}

            {/* API ERROR */}
            {error && (
              <div className="mt-6 rounded-xl border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
                Booking ID is available, but additional
                details could not be loaded: {error}
              </div>
            )}

            {/* REAL BOOKING DETAILS */}
            {order && (
              <div className="mt-8 space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-[#142B49]">
                    Delivery Details
                  </h2>

                  <p className="mt-1 text-sm text-gray-500">
                    Your booking information
                  </p>
                </div>

                {/* ROUTE */}
                <div className="rounded-2xl border border-gray-100 p-6">
                  <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="h-4 w-4 rounded-full border-4 border-[#00BFAF] bg-white" />
                      <div className="my-2 h-16 w-px bg-gray-200" />
                      <div className="h-4 w-4 rounded-full bg-[#142B49]" />
                    </div>

                    <div className="flex-1 space-y-6">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                          Pickup Location
                        </p>

                        <p className="mt-1 font-semibold text-[#142B49]">
                          {order.pickupAddress}
                        </p>

                        <p className="mt-1 text-sm text-gray-500">
                          PIN: {order.pickupPin}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                          Delivery Location
                        </p>

                        <p className="mt-1 font-semibold text-[#142B49]">
                          {order.deliveryAddress}
                        </p>

                        <p className="mt-1 text-sm text-gray-500">
                          PIN: {order.deliveryPin}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* PRICE + STATUS */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl bg-[#F4FAFA] p-5">
                    <p className="text-sm text-gray-500">
                      Delivery Distance
                    </p>

                    <p className="mt-2 text-2xl font-bold text-[#142B49]">
                      {order.billableKm} km
                    </p>
                  </div>

                  <div className="rounded-2xl bg-[#F4FAFA] p-5">
                    <p className="text-sm text-gray-500">
                      Total Delivery Charge
                    </p>

                    <p className="mt-2 text-2xl font-bold text-[#008F84]">
                      ₹{order.totalCharge.toLocaleString("en-IN")}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#BCEAE5] bg-[#E0F8F7] p-5">
                  <div>
                    <p className="text-sm text-gray-600">
                      Current Order Status
                    </p>

                    <p className="mt-1 font-bold text-[#142B49]">
                      {order.status.replaceAll("_", " ")}
                    </p>
                  </div>

                  <span className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-[#008F84]">
                    ● {order.status.replaceAll("_", " ")}
                  </span>
                </div>
              </div>
            )}

            {/* ACTION BUTTONS */}
            <div className="mt-9 grid gap-3 sm:grid-cols-2">
              {orderId && (
                <Link
                  href={`/orders/${encodeURIComponent(orderId)}`}
                  className="rounded-xl bg-[#00BFAF] px-5 py-3 text-center font-semibold text-white transition hover:bg-[#009F93]"
                >
                  🚚 Track My Order
                </Link>
              )}

              <Link
                href="/orders"
                className="rounded-xl border border-[#00BFAF] px-5 py-3 text-center font-semibold text-[#008F84] transition hover:bg-[#E0F8F7]"
              >
                📦 View My Orders
              </Link>

              <Link
                href="/orders/new"
                className="rounded-xl border border-gray-200 px-5 py-3 text-center font-semibold text-[#142B49] transition hover:bg-gray-50"
              >
                + Book Another Delivery
              </Link>

              <Link
                href="/dashboard"
                className="rounded-xl border border-gray-200 px-5 py-3 text-center font-semibold text-[#142B49] transition hover:bg-gray-50"
              >
                Go to Dashboard
              </Link>
            </div>
          </div>
        </section>

        <p className="mt-6 text-center text-sm text-gray-500">
          Thank you for choosing InShip.
        </p>
      </div>
    </main>
  );
}

export default function OrderSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="p-10 text-center">
          Loading order confirmation...
        </div>
      }
    >
      <OrderSuccessContent />
    </Suspense>
  );
}
