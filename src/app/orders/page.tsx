
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import ParcelTabs, { type ParcelTab } from "@/components/ParcelTabs";

type Order = {
  isSent: boolean;
  isIncoming: boolean;
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

export default function MyOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeTab, setActiveTab] = useState<ParcelTab>("ALL");

  const sentOrders = orders.filter((order) => order.isSent);
  const incomingOrders = orders.filter((order) => order.isIncoming);

  const filteredOrders =
    activeTab === "SENT"
      ? sentOrders
      : activeTab === "INCOMING"
        ? incomingOrders
        : orders;
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Fetch all orders from database
  const fetchOrders = useCallback(async (refresh = false) => {
    try {
      if (refresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const response = await fetch("/api/orders", {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Unable to load orders");
      }

      const data = await response.json();

      if (!data.success || !Array.isArray(data.orders)) {
        throw new Error("Invalid orders response");
      }

      const sorted = [...data.orders].sort(
        (a: Order, b: Order) =>
          new Date(b.createdAt).getTime() -
          new Date(a.createdAt).getTime()
      );

      setOrders(sorted);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong"
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchOrders();
  }, [fetchOrders]);

  // Copy full order ID to clipboard
  async function copyOrderId(orderId: string) {
    try {
      await navigator.clipboard.writeText(orderId);
      setCopiedId(orderId);
    } catch (err) {
      console.error("Failed to copy order ID:", err);
      alert("Unable to copy Order ID");
    }
  }

  // Dashboard statistics
  const totalOrders = orders.length;

  const activeOrders = orders.filter(
    (order) =>
      order.status === "PLACED" ||
      order.status === "ACCEPTED" ||
      order.status === "IN_TRANSIT"
  ).length;

  const completedOrders = orders.filter(
    (order) => order.status === "COMPLETED"
  ).length;

  return (
    <main className="min-h-screen bg-[#F4FAFA] text-[#142B49]">
      <Navbar />

      <div className="mx-auto max-w-7xl px-5 py-10 sm:px-6">

        {/* PAGE HEADER */}
        <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-[#008F84]">
              InShip / Deliveries
            </p>

            <h1 className="text-3xl font-extrabold tracking-tight text-[#142B49] sm:text-4xl">
              My Orders
            </h1>

            <p className="mt-3 text-gray-600">
              View, manage and track your parcel deliveries
              in one place.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void fetchOrders(true)}
              disabled={refreshing || loading}
              className="rounded-xl border border-[#BCEAE5] bg-white px-5 py-3 font-semibold text-[#008F84] transition hover:bg-[#E0F8F7] disabled:opacity-50"
            >
              {refreshing ? "Refreshing..." : "↻ Refresh"}
            </button>

            <Link
              href="/orders/new"
              className="rounded-xl bg-[#00BFAF] px-6 py-3 text-center font-semibold text-white shadow-sm transition hover:bg-[#009F93]"
            >
              + New Order
            </Link>
          </div>
        </div>

        {/* STATISTICS CARDS */}
        <div className="mb-10 grid gap-4 sm:grid-cols-3">
          {[
            {
              title: "Total Orders",
              value: totalOrders,
              icon: "📦",
              description: "All bookings",
            },
            {
              title: "Active Deliveries",
              value: activeOrders,
              icon: "🚚",
              description: "Currently in progress",
            },
            {
              title: "Completed",
              value: completedOrders,
              icon: "✓",
              description: "Successfully delivered",
            },
          ].map((stat) => (
            <div
              key={stat.title}
              className="rounded-2xl border border-[#E1F0EF] bg-white p-6 shadow-sm transition hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    {stat.title}
                  </p>

                  <h2 className="mt-3 text-4xl font-bold text-[#142B49]">
                    {loading ? "—" : stat.value}
                  </h2>

                  <p className="mt-2 text-sm text-[#008F84]">
                    {stat.description}
                  </p>
                </div>

                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#E0F8F7] text-2xl">
                  {stat.icon}
                </div>
              </div>
            </div>
          ))}
        </div>

        
        <ParcelTabs
          activeTab={activeTab}
          onChange={setActiveTab}
          totalCount={orders.length}
          sentCount={sentOrders.length}
          incomingCount={incomingOrders.length}
        />

{/* ORDERS SECTION HEADER */}
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-[#142B49]">
              {activeTab === "SENT"
                ? "Sent Parcels"
                : activeTab === "INCOMING"
                  ? "Incoming Parcels"
                  : "Your Deliveries"}
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              All your booking records and current statuses
            </p>
          </div>

          {!loading && !error && (
            <span className="rounded-full bg-[#E0F8F7] px-4 py-2 text-sm font-semibold text-[#008F84]">
              {filteredOrders.length} Orders
            </span>
          )}
        </div>

        {/* ERROR MESSAGE */}
        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
            <p className="font-semibold">
              Unable to load orders
            </p>

            <p className="mt-2 text-sm">{error}</p>

            <button
              type="button"
              onClick={() => void fetchOrders(true)}
              className="mt-4 rounded-lg bg-red-600 px-4 py-2 font-semibold text-white"
            >
              Try Again
            </button>
          </div>
        )}

        {/* LOADING STATE */}
        {loading && (
          <div className="rounded-2xl border border-[#E1F0EF] bg-white p-12 text-center text-gray-500">
            Loading your orders...
          </div>
        )}

        {/* EMPTY STATE */}
        {!loading && !error && filteredOrders.length === 0 && (
          <div className="rounded-3xl border border-[#E1F0EF] bg-white px-6 py-16 text-center shadow-sm">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#E0F8F7] text-4xl">
              📦
            </div>

            <h3 className="mt-6 text-2xl font-bold text-[#142B49]">
              No Parcels Found
            </h3>

            <p className="mx-auto mt-3 max-w-md text-gray-500">
              No parcels are available in this category.
            </p>

            <Link
              href="/orders/new"
              className="mt-6 inline-block rounded-xl bg-[#00BFAF] px-6 py-3 font-semibold text-white hover:bg-[#009F93]"
            >
              Create New Order
            </Link>
          </div>
        )}

        {/* ORDER CARDS */}
        {!loading && !error && filteredOrders.length > 0 && (
          <div className="grid gap-5 lg:grid-cols-2">
            {filteredOrders.map((order) => (
              <article
                key={order.id}
                className="overflow-hidden rounded-2xl border border-[#E1F0EF] bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-[#BCEAE5] hover:shadow-lg"
              >

                {/* ORDER CARD HEADER */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#EDF4F3] bg-[#FBFEFE] px-6 py-5">
                  <div className="min-w-0">
                    <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
                      Order ID
                    </p>

                    <div className="mt-2 flex flex-wrap items-center gap-3">
                      <p
                        className="max-w-[180px] truncate font-mono text-sm font-bold text-[#142B49]"
                        title={order.id}
                      >
                        {order.id}
                      </p>

                      {/* COPY ORDER ID BUTTON */}
                      <button
                        type="button"
                        onClick={() => void copyOrderId(order.id)}
                        className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                          copiedId === order.id
                            ? "border-green-200 bg-green-50 text-green-700"
                            : "border-[#BCEAE5] bg-[#E0F8F7] text-[#008F84] hover:bg-[#C9F0EC]"
                        }`}
                      >
                        {copiedId === order.id
                          ? "✓ Copied"
                          : "Copy ID"}
                      </button>
                    </div>
                  </div>

                  {/* STATUS BADGE */}
                  <span
                    className={`rounded-full px-4 py-2 text-xs font-bold ${getStatusStyle(
                      order.status
                    )}`}
                  >
                    {order.status.replaceAll("_", " ")}
                  </span>
                </div>

                {/* ORDER CARD BODY */}
                <div className="p-6">

                  {/* PICKUP AND DELIVERY ROUTE */}
                  <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <span className="h-4 w-4 rounded-full border-4 border-[#00BFAF] bg-white" />

                      <span className="my-2 h-16 w-px bg-[#C8E7E3]" />

                      <span className="h-4 w-4 rounded-full bg-[#142B49]" />
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

                  {/* DISTANCE AND CHARGE */}
                  <div className="mt-6 grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-[#F4FAFA] p-4">
                      <p className="text-xs text-gray-500">
                        Distance
                      </p>

                      <p className="mt-1 text-lg font-bold text-[#142B49]">
                        {order.billableKm} km
                      </p>
                    </div>

                    <div className="rounded-xl bg-[#F4FAFA] p-4">
                      <p className="text-xs text-gray-500">
                        Delivery Charge
                      </p>

                      <p className="mt-1 text-lg font-bold text-[#008F84]">
                        ₹{order.totalCharge.toLocaleString("en-IN")}
                      </p>
                    </div>
                  </div>

                  {/* CARD FOOTER */}
                  <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-5">
                    <p className="text-xs text-gray-500">
                      {new Date(order.createdAt).toLocaleDateString(
                        "en-IN",
                        {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        }
                      )}
                    </p>

                    <Link
                      href={`/orders/${encodeURIComponent(order.id)}`}
                      className="rounded-xl bg-[#00BFAF] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#009F93]"
                    >
                      Track Order →
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
