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

export default function DashboardPage() {

  const [orders, setOrders] = useState<Order[]>([]);
  const [activeTab, setActiveTab] = useState<ParcelTab>("ALL");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  // Email verification status
  const [emailVerified, setEmailVerified] =
    useState<boolean | null>(null);

  const sentOrders = orders.filter(
    (order) => order.isSent
  );

  const incomingOrders = orders.filter(
    (order) => order.isIncoming
  );

  const filteredOrders =
    activeTab === "SENT"
      ? sentOrders
      : activeTab === "INCOMING"
        ? incomingOrders
        : orders;

  // ==========================================
  // FETCH EMAIL VERIFICATION STATUS
  // ==========================================

  const fetchUser = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/me", {
        cache: "no-store",
      });

      const data = await response.json();

      if (
        response.ok &&
        data.success &&
        data.user &&
        typeof data.user.emailVerified === "boolean"
      ) {
        setEmailVerified(data.user.emailVerified);
      } else {
        setEmailVerified(null);
      }

    } catch (error) {
      console.error("Unable to load user:", error);
      setEmailVerified(null);
    }
  }, []);

  // ==========================================
  // FETCH ORDERS
  // ==========================================

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
        throw new Error("Unable to fetch orders");
      }

      const data = await response.json();

      if (!data.success || !Array.isArray(data.orders)) {
        throw new Error("Invalid orders response");
      }

      const sortedOrders = [...data.orders].sort(
        (a: Order, b: Order) =>
          new Date(b.createdAt).getTime() -
          new Date(a.createdAt).getTime()
      );

      setOrders(sortedOrders);

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
    void fetchUser();
  }, [fetchOrders, fetchUser]);

  async function refreshDashboard() {
    await Promise.all([
      fetchOrders(true),
      fetchUser(),
    ]);
  }

  // ==========================================
  // STATISTICS
  // ==========================================

  const totalOrders = orders.length;

  const inTransit = orders.filter(
    (order) => order.status === "IN_TRANSIT"
  ).length;

  const completed = orders.filter(
    (order) => order.status === "COMPLETED"
  ).length;

  const pending = orders.filter(
    (order) =>
      order.status === "PLACED" ||
      order.status === "ACCEPTED"
  ).length;

  const recentOrders = filteredOrders.slice(0, 10);

  const stats = [
    {
      label: "Total Orders",
      value: totalOrders,
      description: "All parcel bookings",
    },
    {
      label: "Pending",
      value: pending,
      description: "Placed or accepted",
    },
    {
      label: "In Transit",
      value: inTransit,
      description: "Currently on the way",
    },
    {
      label: "Completed",
      value: completed,
      description: "Successfully delivered",
    },
  ];

  function getStatusColor(status: string) {
    switch (status) {
      case "COMPLETED":
        return "bg-green-100 text-green-700";

      case "IN_TRANSIT":
        return "bg-purple-100 text-purple-700";

      case "CANCELLED":
        return "bg-red-100 text-red-700";

      case "ACCEPTED":
        return "bg-yellow-100 text-yellow-700";

      default:
        return "bg-[#E0F8F7] text-[#008F84]";
    }
  }

  // ==========================================
  // DASHBOARD UI
  // ==========================================

  return (
    <main className="min-h-screen bg-[#F4FAFA]">

      <Navbar />

      <div className="mx-auto max-w-7xl px-6 py-10">

        {/* HEADER */}

        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

          <div>

            <div className="flex flex-wrap items-center gap-3">

              <h1 className="text-3xl font-bold text-[#142B49]">
                My Dashboard
              </h1>

              {emailVerified === true && (
                <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                  ✓ Email Verified
                </span>
              )}

            </div>

            <p className="mt-2 text-gray-600">
              Manage and track your parcel deliveries.
            </p>

          </div>

          <div className="flex flex-wrap gap-3">

            <button
              type="button"
              onClick={() => void refreshDashboard()}
              disabled={refreshing}
              className="rounded-lg border border-[#00BFAF] bg-white px-5 py-3 font-semibold text-[#008F84] hover:bg-[#E0F8F7] disabled:opacity-50"
            >
              {refreshing ? "Refreshing..." : "↻ Refresh"}
            </button>

            <Link
              href="/orders/new"
              className="rounded-lg bg-[#00BFAF] px-6 py-3 text-center font-semibold text-white hover:bg-[#009F93]"
            >
              + New Order
            </Link>

          </div>

        </div>

        {/* LIVE DATA NOTICE */}

        <div className="mb-8 rounded-lg border border-[#BCEAE5] bg-[#E0F8F7] px-5 py-3 text-sm text-[#142B49]">
          Live Dashboard — Orders and statistics are
          loaded from your Neon PostgreSQL database.
        </div>

        {/* QUICK ACTIONS */}

        <div className="mb-8 grid gap-4 sm:grid-cols-2">

          <Link
            href="/orders"
            className="rounded-2xl border border-[#BCEAE5] bg-white p-6 transition-all hover:border-[#00BFAF] hover:shadow-lg"
          >

            <div className="mb-3 text-3xl">📦</div>

            <h2 className="text-xl font-bold text-[#142B49]">
              My Orders
            </h2>

            <p className="mt-2 text-sm text-gray-600">
              View all your parcel bookings and
              delivery statuses.
            </p>

          </Link>

          <Link
            href="/track"
            className="rounded-2xl border border-[#BCEAE5] bg-white p-6 transition-all hover:border-[#00BFAF] hover:shadow-lg"
          >

            <div className="mb-3 text-3xl">🚚</div>

            <h2 className="text-xl font-bold text-[#142B49]">
              Track Order
            </h2>

            <p className="mt-2 text-sm text-gray-600">
              Check the current status of your
              parcel delivery.
            </p>

          </Link>

        </div>

        {/* ERROR */}

        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
            {error}
          </div>
        )}

        {/* LOADING */}

        {loading ? (

          <div className="rounded-xl bg-white p-8 text-center text-gray-500">
            Loading dashboard...
          </div>

        ) : (

          <>

            {/* STATISTICS CARDS */}

            <div className="mb-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">

              {stats.map((stat) => (

                <div
                  key={stat.label}
                  className="rounded-2xl bg-white p-6 shadow-sm"
                >

                  <p className="text-sm font-medium text-gray-500">
                    {stat.label}
                  </p>

                  <h2 className="mt-3 text-4xl font-bold text-[#142B49]">
                    {stat.value}
                  </h2>

                  <p className="mt-2 text-sm text-[#00BFAF]">
                    {stat.description}
                  </p>

                </div>

              ))}

            </div>

            {/* EMAIL VERIFICATION BANNER */}
            {/* Only visible for unverified users */}

            {emailVerified === false && (

              <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#BCEAE5] bg-[#E0F8F7] p-5">

                <div>

                  <h3 className="font-bold text-[#142B49]">
                    📥 Find Your Incoming Parcels
                  </h3>

                  <p className="mt-2 text-sm text-gray-600">
                    Verify your email to securely link parcels
                    addressed to you.
                  </p>

                </div>

                <Link
                  href="/verify-email"
                  className="rounded-xl bg-[#008F84] px-5 py-3 text-sm font-semibold text-white hover:bg-[#00796F]"
                >
                  Verify Email
                </Link>

              </div>

            )}

            {/* PARCEL TABS */}

            <ParcelTabs
              activeTab={activeTab}
              onChange={setActiveTab}
              totalCount={orders.length}
              sentCount={sentOrders.length}
              incomingCount={incomingOrders.length}
            />

            {/* RECENT ORDERS */}

            <section className="mt-10 overflow-hidden rounded-2xl bg-white shadow-sm">

              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-6 py-5">

                <div>

                  <h2 className="text-xl font-bold text-[#142B49]">

                    {activeTab === "SENT"
                      ? "Sent Parcels"
                      : activeTab === "INCOMING"
                        ? "Incoming Parcels"
                        : "Recent Orders"}

                  </h2>

                  <p className="mt-1 text-sm text-gray-500">
                    Latest bookings from your database
                  </p>

                </div>

                <Link
                  href="/orders"
                  className="font-semibold text-[#008F84] hover:underline"
                >
                  View All Orders →
                </Link>

              </div>

              {recentOrders.length === 0 ? (

                <div className="px-6 py-12 text-center">

                  <p className="text-gray-500">
                    No parcels found in this category.
                  </p>

                  <Link
                    href="/orders/new"
                    className="mt-4 inline-block font-semibold text-[#008F84] hover:underline"
                  >
                    Create a new booking →
                  </Link>

                </div>

              ) : (

                <div className="overflow-x-auto">

                  <table className="w-full text-left text-sm">

                    <thead className="bg-[#F4FAFA] text-[#142B49]">

                      <tr>
                        <th className="px-6 py-4">Order ID</th>
                        <th className="px-6 py-4">Route</th>
                        <th className="px-6 py-4">Amount</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4">Action</th>
                      </tr>

                    </thead>

                    <tbody>

                      {recentOrders.map((order) => (

                        <tr
                          key={order.id}
                          className="border-t border-gray-100 text-gray-700"
                        >

                          <td className="px-6 py-4">

                            <span className="font-mono text-xs font-semibold text-[#142B49]">
                              {order.id.slice(0, 8)}...
                            </span>

                          </td>

                          <td className="px-6 py-4">

                            <div className="max-w-xs">

                              <p className="font-medium">
                                {order.pickupAddress}
                              </p>

                              <p className="my-1 text-xs text-gray-400">
                                ↓
                              </p>

                              <p className="font-medium">
                                {order.deliveryAddress}
                              </p>

                            </div>

                          </td>

                          <td className="px-6 py-4 font-semibold">
                            ₹{order.totalCharge.toLocaleString("en-IN")}
                          </td>

                          <td className="px-6 py-4">

                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusColor(
                                order.status
                              )}`}
                            >
                              {order.status.replaceAll("_", " ")}
                            </span>

                          </td>

                          <td className="px-6 py-4">

                            <Link
                              href={`/orders/${order.id}`}
                              className="font-semibold text-[#008F84] hover:underline"
                            >
                              Track →
                            </Link>

                          </td>

                        </tr>

                      ))}

                    </tbody>

                  </table>

                </div>

              )}

            </section>

          </>

        )}

      </div>

    </main>
  );
}