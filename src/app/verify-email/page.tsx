"use client";

import {
  useState,
  useEffect,
  type FormEvent,
} from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";

export default function VerifyEmailPage() {

  const router = useRouter();

  const [checking, setChecking] = useState(true);
  const [canVerify, setCanVerify] = useState(false);

  const [otp, setOtp] = useState("");
  const [email, setEmail] = useState("");

  const [sent, setSent] = useState(false);
  const [verified, setVerified] = useState(false);

  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const [cooldown, setCooldown] = useState(0);
  const [linkedOrders, setLinkedOrders] = useState(0);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // ==========================================
  // CHECK EXISTING VERIFICATION STATUS
  // ==========================================

  useEffect(() => {

    const controller = new AbortController();

    async function checkVerification() {
      try {

        const response = await fetch("/api/auth/me", {
          cache: "no-store",
          signal: controller.signal,
        });

        if (response.status === 401) {
          router.replace("/login");
          return;
        }

        const data = await response.json();

        if (!response.ok || !data.success || !data.user) {
          throw new Error("Unable to load your account");
        }

        if (data.user.role === "ADMIN") {
          router.replace("/admin");
          return;
        }

        if (data.user.role === "AGENT") {
          router.replace("/agent/dashboard");
          return;
        }

        if (data.user.emailVerified === true) {
          router.replace("/dashboard");
          return;
        }

        if (data.user.emailVerified !== false) {
          throw new Error("Unable to check verification status");
        }

        if (!controller.signal.aborted) {
          setEmail(data.user.email);
          setCanVerify(true);
          setChecking(false);
        }

      } catch (err) {

        if (controller.signal.aborted) return;

        setError(
          err instanceof Error
            ? err.message
            : "Unable to check verification status"
        );

        setChecking(false);

      }
    }

    void checkVerification();

    return () => controller.abort();

  }, [router]);

  // ==========================================
  // RESEND TIMER
  // ==========================================

  useEffect(() => {

    if (cooldown <= 0) return;

    const timer = window.setTimeout(() => {
      setCooldown((previous) =>
        Math.max(0, previous - 1)
      );
    }, 1000);

    return () => window.clearTimeout(timer);

  }, [cooldown]);

  // ==========================================
  // SEND OTP
  // ==========================================

  async function sendOTP() {

    if (!canVerify || sending || cooldown > 0) return;

    setSending(true);
    setError("");
    setMessage("");

    try {

      const response = await fetch(
        "/api/auth/send-otp",
        {
          method: "POST",
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {

        if (data.retryAfter) {
          setCooldown(data.retryAfter);
        }

        throw new Error(
          data.error || "Unable to send OTP"
        );

      }

      setEmail(data.email);
      setSent(true);
      setOtp("");
      setCooldown(data.retryAfter || 60);

      setMessage(
        "Verification code sent to your email."
      );

    } catch (err) {

      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong"
      );

    } finally {

      setSending(false);

    }
  }

  // ==========================================
  // VERIFY OTP
  // ==========================================

  async function handleVerify(event: FormEvent) {

    event.preventDefault();

    if (!canVerify || verifying) return;

    if (!/^\d{6}$/.test(otp)) {
      setError("Enter a valid 6-digit OTP");
      return;
    }

    setVerifying(true);
    setError("");
    setMessage("");

    try {

      const response = await fetch(
        "/api/auth/verify-otp",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({ otp }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {

        const attempts =
          typeof data.remainingAttempts === "number"
            ? ` Remaining attempts: ${data.remainingAttempts}`
            : "";

        throw new Error(
          (data.error || "Verification failed") +
            attempts
        );

      }

      setVerified(true);
      setCanVerify(false);
      setLinkedOrders(data.linkedOrders || 0);

    } catch (err) {

      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong"
      );

    } finally {

      setVerifying(false);

    }
  }

  // ==========================================
  // VERIFICATION STATUS LOADING
  // ==========================================

  if (checking) {
    return (
      <main className="min-h-screen bg-[#F4FAFA]">

        <Navbar />

        <div className="flex min-h-[70vh] items-center justify-center">

          <div className="text-center">

            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-[#BCEAE5] border-t-[#008F84]" />

            <p className="mt-5 text-gray-600">
              Checking verification status...
            </p>

          </div>

        </div>

      </main>
    );
  }

  // ==========================================
  // VERIFICATION UI
  // ==========================================

  return (

    <main className="min-h-screen bg-[#F4FAFA] text-[#142B49]">

      <Navbar />

      <div className="mx-auto max-w-lg px-5 py-16">

        <Link
          href="/dashboard"
          className="text-sm font-semibold text-[#008F84] hover:underline"
        >
          ← Back to Dashboard
        </Link>

        <div className="mt-6 rounded-3xl border border-[#DCEFEB] bg-white p-8 shadow-sm">

          {verified ? (

            <div className="text-center">

              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100 text-4xl text-green-600">
                ✓
              </div>

              <h1 className="mt-6 text-3xl font-bold">
                Email Verified!
              </h1>

              <p className="mt-3 text-gray-500">
                Your email has been successfully verified.
              </p>

              <div className="mt-6 rounded-xl bg-[#E0F8F7] p-5">

                <p className="text-sm text-gray-600">
                  Newly Linked Incoming Parcels
                </p>

                <p className="mt-2 text-4xl font-bold text-[#008F84]">
                  {linkedOrders}
                </p>

              </div>

              <Link
                href="/orders"
                className="mt-6 block rounded-xl bg-[#008F84] px-5 py-4 font-semibold text-white hover:bg-[#00796F]"
              >
                View My Parcels
              </Link>

              <Link
                href="/dashboard"
                className="mt-4 block text-sm font-semibold text-[#008F84]"
              >
                Go to Dashboard
              </Link>

            </div>

          ) : (

            <>

              <div className="text-center">

                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-[#E0F8F7] text-4xl">
                  ✉️
                </div>

                <h1 className="mt-6 text-3xl font-bold">
                  Verify Your Email
                </h1>

                <p className="mt-3 text-sm leading-relaxed text-gray-500">
                  Verify your registered email to securely
                  access your incoming parcels.
                </p>

                {email && (
                  <p className="mt-3 break-all text-sm font-semibold text-[#008F84]">
                    {email}
                  </p>
                )}

              </div>

              {error && (

                <div
                  role="alert"
                  className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-red-700"
                >
                  {error}
                </div>

              )}

              {message && (

                <div
                  role="status"
                  className="mt-6 rounded-xl bg-green-50 p-4 text-sm text-green-700"
                >
                  {message}
                </div>

              )}

              {!canVerify ? (

                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="mt-8 w-full rounded-xl bg-[#008F84] px-5 py-4 font-semibold text-white"
                >
                  Retry Status Check
                </button>

              ) : !sent ? (

                <button
                  type="button"
                  onClick={() => void sendOTP()}
                  disabled={sending || cooldown > 0}
                  className="mt-8 w-full rounded-xl bg-[#008F84] px-5 py-4 font-semibold text-white hover:bg-[#00796F] disabled:opacity-50"
                >

                  {sending
                    ? "Sending OTP..."
                    : cooldown > 0
                      ? `Try again in ${cooldown}s`
                      : "Send Verification Code"}

                </button>

              ) : (

                <form
                  onSubmit={handleVerify}
                  className="mt-8"
                >

                  <p className="text-center text-sm text-gray-500">
                    Code sent to
                  </p>

                  <p className="mt-1 break-all text-center font-semibold">
                    {email}
                  </p>

                  <label
                    htmlFor="otp"
                    className="mt-7 block text-sm font-semibold"
                  >
                    Enter 6-digit OTP
                  </label>

                  <input
                    id="otp"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={otp}
                    onChange={(event) =>
                      setOtp(
                        event.target.value.replace(/\D/g, "")
                      )
                    }
                    placeholder="000000"
                    required
                    className="mt-3 w-full rounded-xl border border-[#BCEAE5] px-4 py-4 text-center text-3xl font-bold tracking-[0.4em] outline-none focus:border-[#008F84]"
                  />

                  <p className="mt-3 text-center text-xs text-gray-500">
                    OTP expires after 5 minutes.
                  </p>

                  <button
                    type="submit"
                    disabled={
                      verifying ||
                      sending ||
                      otp.length !== 6
                    }
                    className="mt-6 w-full rounded-xl bg-[#008F84] px-5 py-4 font-semibold text-white hover:bg-[#00796F] disabled:opacity-50"
                  >

                    {verifying
                      ? "Verifying..."
                      : "Verify & Link Parcels"}

                  </button>

                  <button
                    type="button"
                    onClick={() => void sendOTP()}
                    disabled={
                      sending ||
                      verifying ||
                      cooldown > 0
                    }
                    className="mt-4 w-full text-sm font-semibold text-[#008F84] disabled:text-gray-400"
                  >

                    {sending
                      ? "Sending..."
                      : cooldown > 0
                        ? `Resend OTP in ${cooldown}s`
                        : "Resend OTP"}

                  </button>

                </form>

              )}

            </>

          )}

        </div>

      </div>

    </main>

  );
}