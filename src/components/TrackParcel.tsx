
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function TrackParcel() {
  const router = useRouter();
  const [orderId, setOrderId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleTrack(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const id = orderId.trim();

    if (!id) {
      setError("Please enter your Order ID.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `/api/orders/${encodeURIComponent(id)}`,
        { cache: "no-store" }
      );

      if (!response.ok) {
        throw new Error(
          response.status === 404
            ? "Order not found. Check your Order ID."
            : "Unable to check this order."
        );
      }

      const data = await response.json();

      if (!data.success || !data.order) {
        throw new Error("Order not found.");
      }

      router.push(`/orders/${encodeURIComponent(id)}`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong."
      );
      setLoading(false);
    }
  }

  return (
    <section id="track" className="scroll-mt-24 bg-[#E0F8F7] px-6 py-20">
      <div className="mx-auto max-w-3xl text-center">
        <div className="mb-5 text-5xl">📦</div>

        <h2 className="text-3xl font-extrabold text-[#142B49] md:text-4xl">
          Track Your Parcel
        </h2>

        <p className="mx-auto mt-4 max-w-xl text-gray-600">
          Enter your Order ID to view your delivery status and shipment details.
        </p>

        <form
          onSubmit={handleTrack}
          className="mt-9 rounded-2xl border border-[#CDEBE7] bg-white p-6 shadow-lg"
        >
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              type="text"
              aria-label="Order ID"
              placeholder="Paste your Order ID"
              value={orderId}
              onChange={(e) => {
                setOrderId(e.target.value);
                setError("");
              }}
              className="min-w-0 flex-1 rounded-xl border border-gray-200 px-4 py-3 text-[#142B49] outline-none focus:border-[#00BFAF]"
            />

            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-[#00BFAF] px-7 py-3 font-semibold text-white transition hover:bg-[#009F93] disabled:opacity-60"
            >
              {loading ? "Checking..." : "Track Order →"}
            </button>
          </div>

          {error && (
            <p role="alert" className="mt-4 text-sm text-red-600">
              {error}
            </p>
          )}
        </form>

        <Link
          href="/orders"
          className="mt-5 inline-block text-sm font-semibold text-[#008F84] hover:underline"
        >
          View My Orders →
        </Link>
      </div>
    </section>
  );
}
