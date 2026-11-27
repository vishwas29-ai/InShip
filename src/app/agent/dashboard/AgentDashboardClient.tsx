"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import Link from "next/link";

type Assignment = {
  id: string;
  orderId: string;
  type: "PICKUP" | "DELIVERY";
  assignmentStatus: string;
  assignedAt: string;
  completedAt: string | null;
  pickupAddress: string;
  pickupPin: string;
  deliveryAddress: string;
  deliveryPin: string;
  receiverName: string | null;
  receiverPhone: string | null;
  orderStatus: string;
};

export default function AgentDashboardClient() {

  const [assignments, setAssignments] =
    useState<Assignment[]>([]);

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState("");

  const [completingId, setCompletingId] =
    useState<string | null>(null);

  const [sendingId, setSendingId] =
    useState<string | null>(null);

  const [actionError, setActionError] =
    useState("");

  const [actionSuccess, setActionSuccess] =
    useState("");

  // ==========================================
  // OTP STATES
  // ==========================================

  const [otpValues, setOtpValues] =
    useState<Record<string, string>>({});

  const [otpSent, setOtpSent] =
    useState<Record<string, boolean>>({});

  const [cooldowns, setCooldowns] =
    useState<Record<string, number>>({});

  const [taskErrors, setTaskErrors] =
    useState<Record<string, string>>({});

  const [taskMessages, setTaskMessages] =
    useState<Record<string, string>>({});

  const busy =
    completingId !== null ||
    sendingId !== null;

  // ==========================================
  // LOAD ASSIGNMENTS
  // ==========================================

  const loadAssignments = useCallback(
    async (refresh = false) => {

      try {

        if (refresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError("");

        const response = await fetch(
          "/api/agent/assignments",
          {
            cache: "no-store",
          }
        );

        const data = await response.json();

        if (
          !response.ok ||
          !data.success ||
          !Array.isArray(data.assignments)
        ) {
          throw new Error(
            data.error || "Unable to load assignments"
          );
        }

        setAssignments(data.assignments);

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
    },
    []
  );

  useEffect(() => {
    void loadAssignments();
  }, [loadAssignments]);

  // ==========================================
  // OTP RESEND COUNTDOWN
  // ==========================================

  useEffect(() => {

    const timer = window.setInterval(() => {

      setCooldowns((previous) => {

        if (
          !Object.values(previous).some(
            (value) => value > 0
          )
        ) {
          return previous;
        }

        const next = { ...previous };

        for (const id of Object.keys(next)) {
          next[id] = Math.max(0, next[id] - 1);
        }

        return next;
      });

    }, 1000);

    return () => window.clearInterval(timer);

  }, []);

  // ==========================================
  // STATISTICS
  // ==========================================

  const pickupTasks = assignments.filter(
    (item) => item.type === "PICKUP"
  );

  const deliveryTasks = assignments.filter(
    (item) => item.type === "DELIVERY"
  );

  const completedTasks = assignments.filter(
    (item) => item.assignmentStatus === "COMPLETED"
  );

  const activeTasks = assignments.filter(
    (item) =>
      item.assignmentStatus === "ASSIGNED" &&
      item.orderStatus !== "CANCELLED"
  );

  // ==========================================
  // SEND DELIVERY OTP
  // ==========================================

  async function sendDeliveryOTP(
    assignment: Assignment
  ) {

    if (
      busy ||
      assignment.type !== "DELIVERY" ||
      assignment.assignmentStatus !== "ASSIGNED" ||
      assignment.orderStatus !== "IN_TRANSIT" ||
      (cooldowns[assignment.id] || 0) > 0
    ) {
      return;
    }

    setSendingId(assignment.id);

    setActionError("");
    setActionSuccess("");

    setTaskErrors((previous) => ({
      ...previous,
      [assignment.id]: "",
    }));

    setTaskMessages((previous) => ({
      ...previous,
      [assignment.id]: "",
    }));

    try {

      const response = await fetch(
        `/api/agent/assignments/${encodeURIComponent(
          assignment.id
        )}/send-otp`,
        {
          method: "POST",
        }
      );

      const data = await response.json();

      if (
        typeof data.retryAfter === "number" &&
        data.retryAfter > 0
      ) {

        setCooldowns((previous) => ({
          ...previous,
          [assignment.id]: data.retryAfter,
        }));

      }

      if (!response.ok || !data.success) {
        throw new Error(
          data.error || "Unable to send delivery OTP"
        );
      }

      setOtpSent((previous) => ({
        ...previous,
        [assignment.id]: true,
      }));

      setOtpValues((previous) => ({
        ...previous,
        [assignment.id]: "",
      }));

      setTaskMessages((previous) => ({
        ...previous,
        [assignment.id]:
          "OTP sent to receiver's email. Valid for 10 minutes.",
      }));

    } catch (err) {

      setTaskErrors((previous) => ({
        ...previous,
        [assignment.id]:
          err instanceof Error
            ? err.message
            : "Something went wrong",
      }));

    } finally {

      setSendingId(null);

    }
  }

  // ==========================================
  // COMPLETE PICKUP OR DELIVERY
  // ==========================================

  async function completeTask(
    assignment: Assignment
  ) {

    if (
      busy ||
      assignment.assignmentStatus !== "ASSIGNED"
    ) {
      return;
    }

    const isDelivery =
      assignment.type === "DELIVERY";

    if (
      isDelivery
        ? assignment.orderStatus !== "IN_TRANSIT"
        : assignment.orderStatus !== "PLACED"
    ) {
      return;
    }

    const otp =
      otpValues[assignment.id] || "";

    if (isDelivery && !/^\d{6}$/.test(otp)) {

      setTaskErrors((previous) => ({
        ...previous,
        [assignment.id]:
          "Enter a valid 6-digit delivery OTP",
      }));

      return;
    }

    const confirmed = window.confirm(
      isDelivery
        ? "Confirm that the parcel has been handed over to the receiver?"
        : "Confirm that you have collected this parcel?"
    );

    if (!confirmed) return;

    setCompletingId(assignment.id);

    setActionError("");
    setActionSuccess("");

    setTaskErrors((previous) => ({
      ...previous,
      [assignment.id]: "",
    }));

    try {

      const response = await fetch(
        `/api/agent/assignments/${encodeURIComponent(
          assignment.id
        )}/complete`,
        {
          method: "PATCH",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify(
            isDelivery ? { otp } : {}
          ),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {

        const remaining =
          typeof data.remainingAttempts === "number"
            ? ` Remaining attempts: ${data.remainingAttempts}`
            : "";

        throw new Error(
          (data.error || "Unable to complete task") +
            remaining
        );

      }

      setAssignments((previous) =>
        previous.map((item) => {

          if (item.id === assignment.id) {

            return {
              ...item,
              assignmentStatus: "COMPLETED",
              completedAt: data.assignment.completedAt,
              orderStatus: data.orderStatus,
            };

          }

          if (item.orderId === assignment.orderId) {

            return {
              ...item,
              orderStatus: data.orderStatus,
            };

          }

          return item;
        })
      );

      setOtpValues((previous) => ({
        ...previous,
        [assignment.id]: "",
      }));

      setOtpSent((previous) => ({
        ...previous,
        [assignment.id]: false,
      }));

      setTaskMessages((previous) => ({
        ...previous,
        [assignment.id]: "",
      }));

      setActionSuccess(
        data.message || "Task completed successfully"
      );

    } catch (err) {

      const message =
        err instanceof Error
          ? err.message
          : "Something went wrong";

      if (isDelivery) {

        setTaskErrors((previous) => ({
          ...previous,
          [assignment.id]: message,
        }));

      } else {

        setActionError(message);

      }

    } finally {

      setCompletingId(null);

    }
  }

  // ==========================================
  // ASSIGNMENT CARD
  // ==========================================

  function renderTaskCard(item: Assignment) {

    const isCompleted =
      item.assignmentStatus === "COMPLETED";

    const isCancelled =
      item.assignmentStatus === "CANCELLED" ||
      item.orderStatus === "CANCELLED";

    const isDelivery =
      item.type === "DELIVERY";

    const canComplete =
      !isCompleted &&
      !isCancelled &&
      item.assignmentStatus === "ASSIGNED" &&
      (
        isDelivery
          ? item.orderStatus === "IN_TRANSIT"
          : item.orderStatus === "PLACED"
      );

    const cooldown =
      cooldowns[item.id] || 0;

    const otp =
      otpValues[item.id] || "";

    return (

      <div
        key={item.id}
        className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
      >

        {/* ASSIGNMENT HEADER */}

        <div className="flex flex-wrap items-center justify-between gap-3">

          <span className="rounded-full bg-teal-100 px-3 py-1 text-sm font-semibold text-teal-800">

            {isDelivery
              ? "🚚 Delivery"
              : "📦 Pickup"}

          </span>

          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              isCompleted
                ? "bg-green-100 text-green-700"
                : isCancelled
                  ? "bg-red-100 text-red-700"
                  : "bg-blue-100 text-blue-700"
            }`}
          >

            {item.assignmentStatus.replaceAll("_", " ")}

          </span>

        </div>

        <p className="mt-4 text-xs font-semibold text-gray-500">
          ORDER ID
        </p>

        <p className="break-all font-mono text-sm text-gray-800">
          {item.orderId}
        </p>

        {/* PARCEL ADDRESSES */}

        <div className="mt-4 space-y-3">

          <div className="rounded-xl bg-gray-50 p-4">

            <p className="text-xs font-semibold text-gray-500">
              📍 PICKUP ADDRESS
            </p>

            <p className="mt-2 text-sm font-medium text-gray-900">
              {item.pickupAddress}
            </p>

            <p className="mt-1 text-xs text-gray-500">
              PIN: {item.pickupPin}
            </p>

          </div>

          <div className="rounded-xl bg-gray-50 p-4">

            <p className="text-xs font-semibold text-gray-500">
              🏁 DELIVERY ADDRESS
            </p>

            <p className="mt-2 text-sm font-medium text-gray-900">
              {item.deliveryAddress}
            </p>

            <p className="mt-1 text-xs text-gray-500">
              PIN: {item.deliveryPin}
            </p>

          </div>

        </div>

        {/* RECEIVER DETAILS */}

        {isDelivery && (

          <div className="mt-4 rounded-xl border border-teal-100 bg-teal-50 p-4">

            <h3 className="font-bold text-[#142B49]">
              👤 Receiver Details
            </h3>

            <p className="mt-3 text-xs text-gray-500">
              Receiver Name
            </p>

            <p className="mt-1 font-semibold text-gray-900">
              {item.receiverName || "Not provided"}
            </p>

            <p className="mt-3 text-xs text-gray-500">
              Mobile Number
            </p>

            {item.receiverPhone ? (

              <>

                <p className="mt-1 font-semibold text-gray-900">
                  +91 {item.receiverPhone}
                </p>

                {!isCancelled && !isCompleted && (

                  <a
                    href={`tel:+91${item.receiverPhone}`}
                    className="mt-3 inline-flex rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"
                  >
                    📞 Call Receiver
                  </a>

                )}

              </>

            ) : (

              <p className="mt-1 text-sm text-gray-500">
                Phone number not provided
              </p>

            )}

          </div>

        )}

        {/* COMPLETED TASK */}

        {isCompleted && (

          <div className="mt-4 rounded-lg bg-green-50 p-3">

            <p className="text-sm font-semibold text-green-700">

              {isDelivery
                ? "✓ Delivery Completed"
                : "✓ Pickup Completed"}

            </p>

            {item.completedAt && (

              <p className="mt-1 text-xs text-green-700">

                {new Date(
                  item.completedAt
                ).toLocaleString("en-IN")}

              </p>

            )}

          </div>

        )}

        {/* CANCELLED TASK */}

        {isCancelled && !isCompleted && (

          <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            This assignment has been cancelled.
          </div>

        )}

        {/* ORDER STATUS */}

        <div className="mt-5 border-t border-gray-200 pt-4">

          <p className="mb-3 text-sm text-gray-500">

            Order Status:{" "}

            <span className="font-semibold text-gray-800">

              {item.orderStatus.replaceAll("_", " ")}

            </span>

          </p>

          <div className="flex flex-wrap gap-3">

            {item.assignmentStatus !== "CANCELLED" && (

              <Link
                href={`/orders/${encodeURIComponent(
                  item.orderId
                )}`}
                className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"
              >
                View Order
              </Link>

            )}

            {/* PICKUP BUTTON */}

            {!isDelivery &&
              item.assignmentStatus === "ASSIGNED" &&
              !isCancelled && (

                <button
                  type="button"
                  onClick={() => void completeTask(item)}
                  disabled={busy || !canComplete}
                  className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
                >

                  {completingId === item.id
                    ? "Completing..."
                    : "Mark as Picked Up"}

                </button>

              )}

          </div>

          {/* DELIVERY OTP SECTION */}

          {isDelivery && canComplete && (

            <div className="mt-5 rounded-2xl border border-[#BCEAE5] bg-[#F4FAFA] p-5">

              <h3 className="text-lg font-bold text-[#142B49]">
                🔐 Delivery Verification
              </h3>

              <p className="mt-2 text-sm leading-relaxed text-gray-600">
                Request an OTP when you reach the receiver.
                Enter the code provided by the receiver
                to complete delivery.
              </p>

              {taskMessages[item.id] && (

                <div
                  role="status"
                  className="mt-4 rounded-lg bg-green-100 p-3 text-sm text-green-700"
                >
                  {taskMessages[item.id]}
                </div>

              )}

              {taskErrors[item.id] && (

                <div
                  role="alert"
                  className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700"
                >
                  {taskErrors[item.id]}
                </div>

              )}

              {/* SEND OTP BUTTON */}

              <button
                type="button"
                onClick={() => void sendDeliveryOTP(item)}
                disabled={busy || cooldown > 0}
                className="mt-4 w-full rounded-xl bg-[#008F84] px-5 py-3 font-semibold text-white hover:bg-[#00796F] disabled:cursor-not-allowed disabled:opacity-50"
              >

                {sendingId === item.id
                  ? "Sending OTP..."
                  : cooldown > 0
                    ? `Resend OTP in ${cooldown}s`
                    : otpSent[item.id]
                      ? "Resend Delivery OTP"
                      : "Send Delivery OTP"}

              </button>

              {/* OTP INPUT */}

              <label
                htmlFor={`otp-${item.id}`}
                className="mt-5 block text-sm font-semibold text-[#142B49]"
              >
                Enter Receiver's OTP
              </label>

              <input
                id={`otp-${item.id}`}
                type="text"
                inputMode="numeric"
                autoComplete="off"
                maxLength={6}
                disabled={busy}
                value={otp}
                onChange={(event) => {

                  const value =
                    event.target.value
                      .replace(/\D/g, "")
                      .slice(0, 6);

                  setOtpValues((previous) => ({
                    ...previous,
                    [item.id]: value,
                  }));

                }}
                placeholder="000000"
                className="mt-3 w-full rounded-xl border border-[#BCEAE5] bg-white px-4 py-4 text-center text-3xl font-bold tracking-[0.4em] text-[#142B49] outline-none focus:border-[#008F84]"
              />

              <p className="mt-2 text-center text-xs text-gray-500">
                OTP expires after 10 minutes.
              </p>

              {/* VERIFY AND COMPLETE */}

              <button
                type="button"
                onClick={() => void completeTask(item)}
                disabled={
                  busy ||
                  otp.length !== 6
                }
                className="mt-5 w-full rounded-xl bg-green-600 px-5 py-4 font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
              >

                {completingId === item.id
                  ? "Verifying OTP..."
                  : "Verify OTP & Complete Delivery"}

              </button>

              <p className="mt-3 text-center text-xs text-gray-500">
                Delivery cannot be completed without a valid OTP.
              </p>

            </div>

          )}

          {/* STATUS RESTRICTIONS */}

          {!isCompleted &&
            !isCancelled &&
            item.assignmentStatus === "ASSIGNED" &&
            !canComplete && (

              <p className="mt-3 text-xs text-amber-700">

                {isDelivery
                  ? "Delivery is available after pickup completion and admin dispatch."
                  : "Pickup is available only when order status is PLACED."}

              </p>

            )}

        </div>

      </div>

    );
  }

  // ==========================================
  // MAIN DASHBOARD
  // ==========================================

  return (

    <main className="min-h-screen bg-[#F4FAFA] px-5 py-10">

      <div className="mx-auto max-w-6xl">

        {/* HEADER */}

        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">

          <div>

            <h1 className="text-3xl font-extrabold text-[#142B49]">
              Agent Dashboard
            </h1>

            <p className="mt-2 text-gray-600">
              Manage your assigned pickup and delivery tasks.
            </p>

          </div>

          <button
            type="button"
            onClick={() => void loadAssignments(true)}
            disabled={loading || refreshing || busy}
            className="rounded-lg border border-teal-200 bg-white px-4 py-2 text-sm font-semibold text-teal-700 hover:bg-teal-50 disabled:opacity-50"
          >

            {refreshing
              ? "Refreshing..."
              : "↻ Refresh Dashboard"}

          </button>

        </div>

        {/* SUCCESS MESSAGE */}

        {actionSuccess && (

          <p
            role="status"
            className="mb-4 rounded-lg bg-green-50 p-4 text-green-700"
          >
            {actionSuccess}
          </p>

        )}

        {/* ERROR MESSAGE */}

        {actionError && (

          <p
            role="alert"
            className="mb-4 rounded-lg bg-red-50 p-4 text-red-700"
          >
            {actionError}
          </p>

        )}

        {loading && (

          <p className="text-gray-600">
            Loading assignments...
          </p>

        )}

        {error && (

          <div className="rounded-lg bg-red-50 p-4 text-red-600">

            <p>{error}</p>

            <button
              type="button"
              onClick={() => void loadAssignments()}
              className="mt-3 font-semibold underline"
            >
              Try Again
            </button>

          </div>

        )}

        {!loading && !error && (

          <>

            {/* STATISTICS */}

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">

              {[
                {
                  title: "Pickup Tasks",
                  value: pickupTasks.length,
                  icon: "📦",
                },
                {
                  title: "Delivery Tasks",
                  value: deliveryTasks.length,
                  icon: "🚚",
                },
                {
                  title: "Active Tasks",
                  value: activeTasks.length,
                  icon: "🔄",
                },
                {
                  title: "Completed Tasks",
                  value: completedTasks.length,
                  icon: "✅",
                },
              ].map((stat) => (

                <div
                  key={stat.title}
                  className="rounded-2xl border border-[#DCEFEB] bg-white p-6 shadow-sm"
                >

                  <div className="mb-3 text-3xl">
                    {stat.icon}
                  </div>

                  <p className="text-sm text-gray-500">
                    {stat.title}
                  </p>

                  <p className="mt-2 text-3xl font-extrabold text-[#142B49]">
                    {stat.value}
                  </p>

                </div>

              ))}

            </div>

            {/* PICKUP ASSIGNMENTS */}

            <section className="mt-10">

              <h2 className="mb-5 text-2xl font-bold text-[#142B49]">
                📦 Pickup Assignments
              </h2>

              {pickupTasks.length === 0 ? (

                <p className="rounded-xl border bg-white p-5 text-gray-500">
                  No pickup tasks assigned yet.
                </p>

              ) : (

                <div className="grid gap-5 md:grid-cols-2">
                  {pickupTasks.map(renderTaskCard)}
                </div>

              )}

            </section>

            {/* DELIVERY ASSIGNMENTS */}

            <section className="mt-10">

              <h2 className="mb-5 text-2xl font-bold text-[#142B49]">
                🚚 Delivery Assignments
              </h2>

              {deliveryTasks.length === 0 ? (

                <p className="rounded-xl border bg-white p-5 text-gray-500">
                  No delivery tasks assigned yet.
                </p>

              ) : (

                <div className="grid gap-5 md:grid-cols-2">
                  {deliveryTasks.map(renderTaskCard)}
                </div>

              )}

            </section>

          </>

        )}

      </div>

    </main>

  );
}