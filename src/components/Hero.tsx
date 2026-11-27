
"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

type Quote = {
  pickupPin: string;
  deliveryPin: string;
  distanceKm: number;
  billableKm: number;
  totalCharge: number;
};

export default function Hero() {
  const [pickupPin, setPickupPin] = useState("");
  const [deliveryPin, setDeliveryPin] = useState("");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleQuote(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const pinRegex = /^[1-9][0-9]{5}$/;

    setError("");
    setQuote(null);

    if (
      !pinRegex.test(pickupPin) ||
      !pinRegex.test(deliveryPin)
    ) {
      setError("Please enter valid 6-digit Indian PIN codes.");
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
          data.error || "Unable to calculate delivery quote."
        );
      }

      setQuote(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="bg-[#F4FAFA] px-6 py-20">
      <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-2">

        {/* LEFT SECTION */}
        <div>
          <p className="mb-4 font-semibold text-[#00BFAF]">
            SMART PARCEL DELIVERY
          </p>

          <h1 className="text-4xl font-bold leading-tight text-[#142B49] md:text-6xl">
            Deliver Anything.
            <br />
            <span className="text-[#00BFAF]">
              Anywhere in India.
            </span>
          </h1>

          <p className="mt-6 max-w-lg text-lg text-gray-600">
            Book, manage and track your parcels with InShip.
            A smarter and simpler delivery experience.
          </p>

          {/* QUOTE FORM */}
          <div className="mt-10 rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="mb-2 text-xl font-bold text-[#142B49]">
              Get a Delivery Quote
            </h2>

            <p className="mb-5 text-sm text-gray-500">
              Enter pickup and delivery PIN codes to get
              an estimated delivery charge.
            </p>

            <form onSubmit={handleQuote}>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="pickupPin"
                    className="mb-2 block text-sm font-medium text-gray-700"
                  >
                    Pickup PIN Code
                  </label>

                  <input
                    id="pickupPin"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="e.g. 560001"
                    value={pickupPin}
                    onChange={(e) => {
                      setPickupPin(
                        e.target.value.replace(/\D/g, "")
                      );
                      setQuote(null);
                      setError("");
                    }}
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 outline-none focus:border-[#00BFAF]"
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="deliveryPin"
                    className="mb-2 block text-sm font-medium text-gray-700"
                  >
                    Delivery PIN Code
                  </label>

                  <input
                    id="deliveryPin"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="e.g. 110001"
                    value={deliveryPin}
                    onChange={(e) => {
                      setDeliveryPin(
                        e.target.value.replace(/\D/g, "")
                      );
                      setQuote(null);
                      setError("");
                    }}
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 outline-none focus:border-[#00BFAF]"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-5 w-full rounded-lg bg-[#00BFAF] px-6 py-3 font-semibold text-white transition-colors hover:bg-[#009F93] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading
                  ? "Calculating Quote..."
                  : "Get Quote →"}
              </button>
            </form>

            {/* ERROR MESSAGE */}
            {error && (
              <p
                role="alert"
                className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
              >
                {error}
              </p>
            )}

            {/* LIVE QUOTE RESULT */}
            {quote && (
              <div className="mt-6 rounded-xl border border-[#BCEAE5] bg-[#F4FAFA] p-5">
                <div className="mb-4 flex items-center gap-2">
                  <span className="text-xl text-[#008F84]">
                    ✓
                  </span>

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
                      Road Distance
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
                      ₹
                      {quote.totalCharge.toLocaleString(
                        "en-IN"
                      )}
                    </p>
                  </div>
                </div>

                <p className="mt-3 text-xs text-gray-500">
                  Final pricing may vary based on exact
                  pickup and delivery addresses.
                </p>

                <Link
                  href="/orders/new"
                  className="mt-5 block rounded-lg bg-[#142B49] px-5 py-3 text-center font-semibold text-white transition hover:bg-[#203E61]"
                >
                  Book This Delivery →
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT SECTION - DELIVERY ILLUSTRATION */}
        <div className="relative flex min-h-[350px] items-center justify-center rounded-3xl bg-[#E0F8F7] p-4 md:min-h-[450px]">
          <Image
            src="/images/delivery-hero.png"
            alt="InShip delivery truck with parcels and India delivery route"
            width={750}
            height={550}
            priority
            className="h-auto w-full object-contain"
          />
        </div>
      </div>
    </section>
  );
}
