"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useState,
} from "react";

import { useParams } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";

type Order = {
  id: string;
  pickupAddress: string;
  pickupPin: string;
  deliveryAddress: string;
  deliveryPin: string;
  receiverName: string | null;
  receiverPhone: string | null;
  receiverEmail: string | null;
  billableKm: number;
  totalCharge: number;
  status: string;
  createdAt: string;
};

type TrackingEvent = {
  id: string;
  orderId: string;
  status: string;
  description: string;
  location: string | null;
  createdAt: string;
};

const steps = [
  {
    status: "PLACED",
    label: "Order Placed",
    description:
      "Your delivery booking has been created.",
    icon: "📦",
  },
  {
    status: "ACCEPTED",
    label: "Parcel Picked Up",
    description: "Your parcel has been collected.",
    icon: "✓",
  },
  {
    status: "IN_TRANSIT",
    label: "In Transit",
    description: "Your package is on the way.",
    icon: "🚚",
  },
  {
    status: "COMPLETED",
    label: "Delivered",
    description: "Your package has been delivered.",
    icon: "🏠",
  },
];

function getStatusStyle(status: string) {
  switch (status) {
    case "COMPLETED":
      return "bg-green-100 text-green-700";

    case "IN_TRANSIT":
      return "bg-blue-100 text-blue-700";

    case "ACCEPTED":
      return "bg-amber-100 text-amber-700";

    case "CANCELLED":
      return "bg-red-100 text-red-700";

    default:
      return "bg-[#DDF7F3] text-[#008F84]";
  }
}

function getEventIcon(status: string) {
  switch (status) {
    case "PLACED":
      return "📦";

    case "ACCEPTED":
      return "✓";

    case "IN_TRANSIT":
      return "🚚";

    case "COMPLETED":
      return "🏠";

    case "CANCELLED":
      return "✕";

    default:
      return "●";
  }
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date unavailable";
  }

  return date.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function OrderDetailsContent() {
  const params = useParams();
  const id = params.id as string;

  const [order, setOrder] = useState<Order | null>(
    null
  );

  const [events, setEvents] = useState<
    TrackingEvent[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [trackingError, setTrackingError] = useState("");
  const [copied, setCopied] = useState(false);

  const loadOrder = useCallback(
    async (refresh = false) => {
      if (!id) return;

      try {
        if (refresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError("");
        setTrackingError("");

        const orderResponse = await fetch(
          `/api/orders/${encodeURIComponent(id)}`,
          {
            cache: "no-store",
          }
        );

        const orderData = await orderResponse.json();

        if (
          !orderResponse.ok ||
          !orderData.success ||
          !orderData.order
        ) {
          throw new Error(
            orderData.error ||
              "Unable to load order details"
          );
        }

        setOrder(orderData.order);

        try {
          const trackingResponse = await fetch(
            `/api/orders/${encodeURIComponent(
              id
            )}/tracking`,
            {
              cache: "no-store",
            }
          );

          const trackingData =
            await trackingResponse.json();

          if (
            !trackingResponse.ok ||
            !trackingData.success ||
            !Array.isArray(trackingData.events)
          ) {
            throw new Error(
              trackingData.error ||
                "Unable to load tracking history"
            );
          }

          setEvents(trackingData.events);
        } catch (trackingErr) {
          setEvents([]);

          setTrackingError(
            trackingErr instanceof Error
              ? trackingErr.message
              : "Unable to load tracking history"
          );
        }
      } catch (err) {
        setOrder(null);
        setEvents([]);

        setError(
          err instanceof Error
            ? err.message
            : "Something went wrong"
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [id]
  );

  useEffect(() => {
    void loadOrder();
  }, [loadOrder]);

  async function copyOrderId() {
    if (!order) return;

    try {
      await navigator.clipboard.writeText(order.id);
      setCopied(true);
    } catch (err) {
      console.error("Copy failed:", err);
      alert("Unable to copy Order ID");
    }
  }

  const isCancelled =
    order?.status === "CANCELLED";

  const currentStep = order
    ? steps.findIndex(
        (step) => step.status === order.status
      )
    : -1;

  const progress =
    currentStep >= 0
      ? ((currentStep + 1) / steps.length) * 100
      : 0;

  return (
    <main className="min-h-screen bg-[#F4FAFA] text-[#142B49]">
      <Navbar />

      <div className="mx-auto max-w-5xl px-5 py-10 sm:px-6">
        <Link
          href="/orders"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#008F84] hover:underline"
        >
          ← Back to My Orders
        </Link>

        {/* Page Header */}

        <div className="mt-7 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-[#008F84]">
              InShip / Tracking
            </p>

            <h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">
              Track Your Order
            </h1>

            <p className="mt-3 text-gray-600">
              View your delivery progress and booking
              details.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadOrder(true)}
            disabled={loading || refreshing}
            className="rounded-xl border border-[#BCEAE5] bg-white px-5 py-3 text-sm font-semibold text-[#008F84] transition hover:bg-[#E0F8F7] disabled:opacity-50"
          >
            {refreshing
              ? "Refreshing..."
              : "↻ Refresh Status"}
          </button>
        </div>

        {loading && (
          <div className="mt-8 rounded-2xl border border-[#E1F0EF] bg-white p-12 text-center text-gray-500">
            Loading order tracking...
          </div>
        )}

        {error && (
          <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
            <p className="font-semibold">
              Unable to load order
            </p>

            <p className="mt-2 text-sm">{error}</p>

            <button
              type="button"
              onClick={() => void loadOrder(true)}
              className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white"
            >
              Try Again
            </button>
          </div>
        )}

        {!loading && order && (
          <div className="mt-8 space-y-6">
            {/* Order ID and Status */}

            <section className="rounded-2xl border border-[#E1F0EF] bg-white p-6 shadow-sm sm:p-8">
              <div className="flex flex-wrap items-start justify-between gap-5">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Order ID
                  </p>

                  <p className="mt-2 break-all font-mono text-sm font-bold">
                    {order.id}
                  </p>

                  <button
                    type="button"
                    onClick={() => void copyOrderId()}
                    className="mt-3 rounded-lg border border-[#BCEAE5] bg-[#E0F8F7] px-4 py-2 text-xs font-semibold text-[#008F84]"
                  >
                    {copied
                      ? "✓ Copied"
                      : "Copy Order ID"}
                  </button>
                </div>

                <span
                  className={`rounded-full px-4 py-2 text-xs font-bold ${getStatusStyle(
                    order.status
                  )}`}
                >
                  {order.status.replaceAll("_", " ")}
                </span>
              </div>
            </section>

            {/* Delivery Progress */}

            <section className="rounded-2xl border border-[#E1F0EF] bg-white p-6 shadow-sm sm:p-8">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold">
                    Delivery Progress
                  </h2>

                  <p className="mt-1 text-sm text-gray-500">
                    Follow your parcel&apos;s journey.
                  </p>
                </div>

                {!isCancelled && (
                  <span className="text-sm font-bold text-[#008F84]">
                    {Math.round(progress)}% Complete
                  </span>
                )}
              </div>

              {isCancelled ? (
                <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-5 text-red-700">
                  This order has been cancelled.
                </div>
              ) : (
                <>
                  <div className="mt-6 h-3 overflow-hidden rounded-full bg-[#E1F0EF]">
                    <div
                      className="h-full rounded-full bg-[#00BFAF] transition-all duration-500"
                      style={{
                        width: `${progress}%`,
                      }}
                    />
                  </div>

                  <div className="mt-9">
                    {steps.map((step, index) => {
                      const completed =
                        index < currentStep;

                      const active =
                        index === currentStep;

                      const reached =
                        index <= currentStep;

                      const isLast =
                        index === steps.length - 1;

                      return (
                        <div
                          key={step.status}
                          className="flex gap-4"
                        >
                          <div className="flex flex-col items-center">
                            <div
                              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-xl font-bold ${
                                reached
                                  ? "bg-[#00BFAF] text-white"
                                  : "bg-[#EDF4F3] text-gray-400"
                              }`}
                            >
                              {completed
                                ? "✓"
                                : step.icon}
                            </div>

                            {!isLast && (
                              <div
                                className={`my-2 h-12 w-1 rounded-full ${
                                  completed
                                    ? "bg-[#00BFAF]"
                                    : "bg-[#E1F0EF]"
                                }`}
                              />
                            )}
                          </div>

                          <div className="flex-1 pb-8">
                            <div className="flex flex-wrap items-center gap-3">
                              <p
                                className={`font-bold ${
                                  reached
                                    ? "text-[#142B49]"
                                    : "text-gray-400"
                                }`}
                              >
                                {step.label}
                              </p>

                              {active && (
                                <span className="rounded-full bg-[#E0F8F7] px-3 py-1 text-xs font-semibold text-[#008F84]">
                                  Current
                                </span>
                              )}
                            </div>

                            <p className="mt-2 text-sm text-gray-500">
                              {reached
                                ? step.description
                                : "Pending"}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </section>

            {/* Tracking History */}

            <section className="rounded-2xl border border-[#E1F0EF] bg-white p-6 shadow-sm sm:p-8">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#E0F8F7] text-2xl">
                  📍
                </div>

                <div>
                  <h2 className="text-xl font-bold">
                    Tracking History
                  </h2>

                  <p className="mt-1 text-sm text-gray-500">
                    Actual parcel updates recorded by
                    InShip.
                  </p>
                </div>
              </div>

              {trackingError && (
                <p className="mt-6 rounded-lg bg-red-50 p-4 text-sm text-red-700">
                  {trackingError}
                </p>
              )}

              {!trackingError &&
                events.length === 0 && (
                  <div className="mt-6 rounded-xl bg-[#F4FAFA] p-5">
                    <p className="font-semibold">
                      No tracking events recorded yet.
                    </p>

                    <p className="mt-2 text-sm text-gray-500">
                      Agent pickup and delivery updates
                      will appear here when recorded.
                    </p>
                  </div>
                )}

              {!trackingError && events.length > 0 && (
                <div className="mt-8 space-y-0">
                  {events.map((event, index) => {
                    const isLast =
                      index === events.length - 1;

                    return (
                      <div
                        key={event.id}
                        className="flex gap-4"
                      >
                        <div className="flex flex-col items-center">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#00BFAF] text-lg font-bold text-white">
                            {getEventIcon(event.status)}
                          </div>

                          {!isLast && (
                            <div className="my-2 min-h-12 w-1 flex-1 rounded-full bg-[#BCEAE5]" />
                          )}
                        </div>

                        <div className="flex-1 pb-8">
                          <div className="flex flex-wrap items-center gap-3">
                            <p className="font-bold text-[#142B49]">
                              {event.status.replaceAll(
                                "_",
                                " "
                              )}
                            </p>

                            {isLast && (
                              <span className="rounded-full bg-[#E0F8F7] px-3 py-1 text-xs font-semibold text-[#008F84]">
                                Latest Update
                              </span>
                            )}
                          </div>

                          <p className="mt-2 text-sm text-gray-700">
                            {event.description}
                          </p>

                          {event.location && (
                            <p className="mt-2 text-sm text-gray-500">
                              📍 {event.location}
                            </p>
                          )}

                          <p className="mt-2 text-xs font-medium text-gray-400">
                            {formatDate(event.createdAt)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Receiver Details */}

            <section className="rounded-2xl border border-[#E1F0EF] bg-white p-6 shadow-sm sm:p-8">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#E0F8F7] text-2xl">
                  👤
                </div>

                <div>
                  <h2 className="text-xl font-bold">
                    Receiver Details
                  </h2>

                  <p className="mt-1 text-sm text-gray-500">
                    Information about the parcel recipient.
                  </p>
                </div>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-[#DCEFEB] bg-[#F8FCFC] p-5">
                  <p className="text-sm text-gray-500">
                    Receiver Name
                  </p>

                  <p className="mt-2 break-words font-semibold">
                    {order.receiverName ||
                      "Not provided"}
                  </p>
                </div>

                <div className="rounded-xl border border-[#DCEFEB] bg-[#F8FCFC] p-5">
                  <p className="text-sm text-gray-500">
                    Mobile Number
                  </p>

                  <p className="mt-2 font-semibold">
                    {order.receiverPhone
                      ? `+91 ${order.receiverPhone}`
                      : "Not provided"}
                  </p>
                </div>

                <div className="rounded-xl border border-[#DCEFEB] bg-[#F8FCFC] p-5 sm:col-span-2">
                  <p className="text-sm text-gray-500">
                    Email Address
                  </p>

                  <p className="mt-2 break-all font-semibold">
                    {order.receiverEmail ||
                      "Not provided"}
                  </p>
                </div>
              </div>
            </section>

            {/* Delivery Details */}

            <section className="rounded-2xl border border-[#E1F0EF] bg-white p-6 shadow-sm sm:p-8">
              <h2 className="text-xl font-bold">
                Delivery Details
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Pickup and destination information
              </p>

              <div className="mt-7 grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-[#DCEFEB] bg-[#F8FCFC] p-5">
                  <p className="text-sm font-bold text-[#008F84]">
                    📍 Pickup Location
                  </p>

                  <p className="mt-3 font-semibold">
                    {order.pickupAddress}
                  </p>

                  <p className="mt-2 text-sm text-gray-500">
                    PIN: {order.pickupPin}
                  </p>
                </div>

                <div className="rounded-xl border border-[#DCEFEB] bg-[#F8FCFC] p-5">
                  <p className="text-sm font-bold text-[#008F84]">
                    🏁 Delivery Location
                  </p>

                  <p className="mt-3 font-semibold">
                    {order.deliveryAddress}
                  </p>

                  <p className="mt-2 text-sm text-gray-500">
                    PIN: {order.deliveryPin}
                  </p>
                </div>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl bg-[#F4FAFA] p-5">
                  <p className="text-sm text-gray-500">
                    Delivery Distance
                  </p>

                  <p className="mt-2 text-2xl font-bold">
                    {order.billableKm} km
                  </p>
                </div>

                <div className="rounded-xl bg-[#F4FAFA] p-5">
                  <p className="text-sm text-gray-500">
                    Total Delivery Charge
                  </p>

                  <p className="mt-2 text-2xl font-bold text-[#008F84]">
                    ₹
                    {Number(
                      order.totalCharge
                    ).toLocaleString("en-IN")}
                  </p>
                </div>
              </div>

              <div className="mt-6 border-t border-[#E1F0EF] pt-5">
                <p className="text-sm text-gray-500">
                  Booked on{" "}
                  <span className="font-semibold text-[#142B49]">
                    {formatDate(order.createdAt)}
                  </span>
                </p>
              </div>
            </section>

            {/* Footer Actions */}

            <div className="flex flex-wrap gap-3">
              <Link
                href="/orders"
                className="rounded-xl border border-[#BCEAE5] bg-white px-6 py-3 font-semibold text-[#008F84] hover:bg-[#E0F8F7]"
              >
                ← My Orders
              </Link>

              <Link
                href="/orders/new"
                className="rounded-xl bg-[#00BFAF] px-6 py-3 font-semibold text-white hover:bg-[#009F93]"
              >
                + Book Another Delivery
              </Link>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

export default function OrderDetailsPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#F4FAFA] px-6 py-12 text-center text-gray-500">
          Loading order tracking...
        </main>
      }
    >
      <OrderDetailsContent />
    </Suspense>
  );
}