
"use client";

import { useState, type FormEvent } from "react";
import Navbar from "@/components/Navbar";
import { useRouter } from "next/navigation";

export default function NewOrderPage() {
  const router = useRouter();

  const [pickupAddress, setPickupAddress] = useState("");
  const [pickupPin, setPickupPin] = useState("");

  const [receiverName, setReceiverName] = useState("");
  const [receiverPhone, setReceiverPhone] = useState("");
  const [receiverEmail, setReceiverEmail] = useState("");

  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryPin, setDeliveryPin] = useState("");

  const [message, setMessage] = useState("");

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage("");

    const pinRegex = /^[1-9][0-9]{5}$/;
    const phoneRegex = /^[6-9]\d{9}$/;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // Validate addresses
    if (!pickupAddress.trim() || !deliveryAddress.trim()) {
      setMessage("Please enter both complete addresses.");
      return;
    }

    // Validate PIN codes
    if (
      !pinRegex.test(pickupPin) ||
      !pinRegex.test(deliveryPin)
    ) {
      setMessage("Please enter valid 6-digit Indian PIN codes.");
      return;
    }

    // Validate receiver name
    if (
      !receiverName.trim() ||
      receiverName.trim().length > 100
    ) {
      setMessage("Please enter a valid receiver name.");
      return;
    }

    // Validate receiver phone
    if (!phoneRegex.test(receiverPhone)) {
      setMessage("Please enter a valid 10-digit mobile number.");
      return;
    }

    // Validate optional receiver email
    if (
      receiverEmail.trim() &&
      (
        receiverEmail.trim().length > 254 ||
        !emailRegex.test(receiverEmail.trim())
      )
    ) {
      setMessage("Please enter a valid receiver email.");
      return;
    }

    // Store complete booking details
    const bookingDetails = {
      pickupAddress: pickupAddress.trim(),
      pickupPin,
      deliveryAddress: deliveryAddress.trim(),
      deliveryPin,
      receiverName: receiverName.trim(),
      receiverPhone,
      receiverEmail: receiverEmail.trim().toLowerCase(),
    };

    sessionStorage.setItem(
      "inshipBooking",
      JSON.stringify(bookingDetails)
    );

    router.push("/orders/estimate");
  };

  return (
    <main className="min-h-screen bg-[#F4FAFA]">
      <Navbar />

      <div className="mx-auto max-w-3xl px-6 py-10">

        {/* Page Heading */}
        <div className="mb-8">
          <p className="mb-2 text-sm font-semibold text-[#00BFAF]">
            STEP 1 OF 3
          </p>

          <h1 className="text-3xl font-bold text-[#142B49]">
            Book a New Delivery
          </h1>

          <p className="mt-2 text-gray-600">
            Enter your pickup, receiver and destination details.
          </p>
        </div>

        {/* Booking Form */}
        <form
          onSubmit={handleSubmit}
          className="space-y-8 rounded-2xl bg-white p-6 shadow-sm sm:p-8"
        >

          {/* Pickup Section */}
          <section>
            <h2 className="mb-5 text-xl font-bold text-[#142B49]">
              📍 Pickup Details
            </h2>

            <div className="space-y-5">

              <div>
                <label
                  htmlFor="pickupAddress"
                  className="mb-2 block text-sm font-medium text-[#142B49]"
                >
                  Pickup Address *
                </label>

                <textarea
                  id="pickupAddress"
                  rows={3}
                  required
                  value={pickupAddress}
                  onChange={(e) =>
                    setPickupAddress(e.target.value)
                  }
                  placeholder="House no., street, area, city..."
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 outline-none focus:border-[#00BFAF]"
                />
              </div>

              <div>
                <label
                  htmlFor="pickupPin"
                  className="mb-2 block text-sm font-medium text-[#142B49]"
                >
                  Pickup PIN Code *
                </label>

                <input
                  id="pickupPin"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  required
                  value={pickupPin}
                  onChange={(e) =>
                    setPickupPin(
                      e.target.value.replace(/\D/g, "")
                    )
                  }
                  placeholder="Enter 6-digit PIN code"
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 outline-none focus:border-[#00BFAF]"
                />
              </div>

            </div>
          </section>

          <hr className="border-gray-200" />

          {/* Receiver Section */}
          <section>
            <h2 className="mb-2 text-xl font-bold text-[#142B49]">
              👤 Receiver Details
            </h2>

            <p className="mb-5 text-sm text-gray-500">
              Enter the details of the person receiving the parcel.
            </p>

            <div className="space-y-5">

              {/* Receiver Name */}
              <div>
                <label
                  htmlFor="receiverName"
                  className="mb-2 block text-sm font-medium text-[#142B49]"
                >
                  Receiver Full Name *
                </label>

                <input
                  id="receiverName"
                  type="text"
                  required
                  maxLength={100}
                  value={receiverName}
                  onChange={(e) =>
                    setReceiverName(e.target.value)
                  }
                  placeholder="Enter receiver's full name"
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 outline-none focus:border-[#00BFAF]"
                />
              </div>

              {/* Receiver Phone */}
              <div>
                <label
                  htmlFor="receiverPhone"
                  className="mb-2 block text-sm font-medium text-[#142B49]"
                >
                  Receiver Mobile Number *
                </label>

                <div className="flex overflow-hidden rounded-lg border border-gray-300 focus-within:border-[#00BFAF]">

                  <span className="flex items-center border-r border-gray-300 bg-gray-50 px-4 text-gray-600">
                    +91
                  </span>

                  <input
                    id="receiverPhone"
                    type="tel"
                    inputMode="numeric"
                    required
                    maxLength={10}
                    value={receiverPhone}
                    onChange={(e) =>
                      setReceiverPhone(
                        e.target.value.replace(/\D/g, "")
                      )
                    }
                    placeholder="Enter 10-digit mobile number"
                    className="min-w-0 flex-1 px-4 py-3 text-gray-900 outline-none"
                  />

                </div>
              </div>

              {/* Receiver Email */}
              <div>
                <label
                  htmlFor="receiverEmail"
                  className="mb-2 block text-sm font-medium text-[#142B49]"
                >
                  Receiver Email (Optional)
                </label>

                <input
                  id="receiverEmail"
                  type="email"
                  maxLength={254}
                  value={receiverEmail}
                  onChange={(e) =>
                    setReceiverEmail(e.target.value)
                  }
                  placeholder="receiver@example.com"
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 outline-none focus:border-[#00BFAF]"
                />

                <p className="mt-2 text-xs text-gray-500">
                  Receiver email is optional.
                </p>
              </div>

            </div>
          </section>

          <hr className="border-gray-200" />

          {/* Delivery Section */}
          <section>
            <h2 className="mb-5 text-xl font-bold text-[#142B49]">
              🚚 Delivery Details
            </h2>

            <div className="space-y-5">

              <div>
                <label
                  htmlFor="deliveryAddress"
                  className="mb-2 block text-sm font-medium text-[#142B49]"
                >
                  Delivery Address *
                </label>

                <textarea
                  id="deliveryAddress"
                  rows={3}
                  required
                  value={deliveryAddress}
                  onChange={(e) =>
                    setDeliveryAddress(e.target.value)
                  }
                  placeholder="House no., street, area, city..."
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 outline-none focus:border-[#00BFAF]"
                />
              </div>

              <div>
                <label
                  htmlFor="deliveryPin"
                  className="mb-2 block text-sm font-medium text-[#142B49]"
                >
                  Delivery PIN Code *
                </label>

                <input
                  id="deliveryPin"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  required
                  value={deliveryPin}
                  onChange={(e) =>
                    setDeliveryPin(
                      e.target.value.replace(/\D/g, "")
                    )
                  }
                  placeholder="Enter 6-digit PIN code"
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 outline-none focus:border-[#00BFAF]"
                />
              </div>

            </div>
          </section>

          {/* Validation Message */}
          {message && (
            <div
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
            >
              {message}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full rounded-lg bg-[#00BFAF] px-6 py-4 font-semibold text-white transition-colors hover:bg-[#009F93]"
          >
            Continue to Price Estimate →
          </button>

        </form>
      </div>
    </main>
  );
}
