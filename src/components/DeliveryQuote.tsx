
"use client";

import { useState } from "react";
import Link from "next/link";

type Quote = {
  pickupPin: string;
  deliveryPin: string;
  distanceKm: number;
  billableKm: number;
  totalCharge: number;
};

export default function DeliveryQuote() {
  const [pickupPin, setPickupPin] = useState("");
  const [deliveryPin, setDeliveryPin] = useState("");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function getQuote(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setQuote(null);

    if (
      !/^\d{6}$/.test(pickupPin) ||
      !/^\d{6}$/.test(deliveryPin)
    ) {
      setError("Please enter valid 6-digit PIN codes.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/quote", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pickupPin,
          deliveryPin,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error || "Failed to calculate quote"
        );
      }

      setQuote(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="w-full rounded-3xl border border-[#DCEFEB] bg-white p-6 shadow-xl sm:p-8">
      <h2 className="text-2xl font-bold text-[#142B49]">
        Get a Delivery Quote
      </h2>

      <p className="mt-2 text-sm text-gray-500">
        Calculate estimated delivery charges using
        Indian PIN codes.
      </p>

      <form
        onSubmit={getQuote}
        className="mt-6 space-y-4"
      >
        <div>
          <label
            htmlFor="pickupPin"
            className="mb-2 block text-sm font-semibold text-[#142B49]"
          >
            Pickup PIN Code
          </label>

          <input
            id="pickupPin"
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={pickupPin}
            onChange={(e) => {
              setPickupPin(
                e.target.value.replace(/\D/g, "")
              );
              setQuote(null);
            }}
            placeholder="e.g. 110001"
            className="w-full rounded-xl border border-gray-200 bg-[#F8FCFC] px-4 py-3 text-[#142B49] outline-none transition focus:border-[#00BFAF] focus:ring-2 focus:ring-[#00BFAF]/20"
            required
          />
        </div>

        <div>
          <label
            htmlFor="deliveryPin"
            className="mb-2 block text-sm font-semibold text-[#142B49]"
          >
            Delivery PIN Code
          </label>

          <input
            id="deliveryPin"
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={deliveryPin}
            onChange={(e) => {
              setDeliveryPin(
                e.target.value.replace(/\D/g, "")
              );
              setQuote(null);
            }}
            placeholder="e.g. 302001"
            className="w-full rounded-xl border border-gray-200 bg-[#F8FCFC] px-4 py-3 text-[#142B49] outline-none transition focus:border-[#00BFAF] focus:ring-2 focus:ring-[#00BFAF]/20"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-[#00BFAF] px-6 py-3 font-bold text-white transition hover:bg-[#009F93] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading
            ? "Calculating Distance..."
            : "Get Quote →"}
        </button>
      </form>

      {error && (
        <div
          role="alert"
          className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {quote && (
        <div className="mt-6 rounded-2xl border border-[#BCEAE5] bg-[#F4FAFA] p-5">
          <div className="mb-5 flex items-center gap-2">
            <span className="text-xl">✓</span>

            <h3 className="font-bold text-[#142B49]">
              Your Delivery Estimate
            </h3>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between gap-3 text-sm">
              <span className="text-gray-500">
                Pickup PIN
              </span>

              <span className="font-semibold text-[#142B49]">
                {quote.pickupPin}
              </span>
            </div>

            <div className="flex justify-between gap-3 text-sm">
              <span className="text-gray-500">
                Delivery PIN
              </span>

              <span className="font-semibold text-[#142B49]">
                {quote.deliveryPin}
              </span>
            </div>

            <div className="flex justify-between gap-3 text-sm">
              <span className="text-gray-500">
                Estimated Road Distance
              </span>

              <span className="font-semibold text-[#142B49]">
                {quote.distanceKm.toFixed(1)} km
              </span>
            </div>

            <div className="border-t border-[#D4EAE7] pt-4">
              <p className="text-sm text-gray-500">
                Estimated Delivery Charge
              </p>

              <p className="mt-1 text-3xl font-extrabold text-[#008F84]">
                ₹{quote.totalCharge.toLocaleString("en-IN")}
              </p>
            </div>
          </div>

          <p className="mt-3 text-xs text-gray-500">
            Final pricing may change based on exact
            pickup and delivery addresses.
          </p>

          <Link
            href="/orders/new"
            className="mt-5 block rounded-xl bg-[#142B49] px-5 py-3 text-center font-semibold text-white transition hover:bg-[#203E61]"
          >
            Book This Delivery →
          </Link>
        </div>
      )}
    </section>
  );
}
