
"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type UserRole = "CUSTOMER" | "AGENT" | "ADMIN";

function getDashboardPath(role: UserRole): string {
  switch (role) {
    case "ADMIN":
      return "/admin";

    case "AGENT":
      return "/agent/dashboard";

    case "CUSTOMER":
      return "/dashboard";
  }
}

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Step 1: Send login details to backend
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      // Step 2: Read backend response
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Login failed");
      }

      // Step 3: Get role returned by login API
      const role: unknown = data.user?.role;

      if (
        role !== "CUSTOMER" &&
        role !== "AGENT" &&
        role !== "ADMIN"
      ) {
        throw new Error("Invalid user role. Please contact support.");
      }

      // Step 4: Decide dashboard using user role
      const dashboardPath = getDashboardPath(role);

      // Step 5: Redirect user to correct dashboard
      router.replace(dashboardPath);
      router.refresh();

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
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#E0F8F7] via-[#F4FAFA] to-white px-5 py-12">
      <div className="w-full max-w-md rounded-3xl border border-[#DCEFEB] bg-white p-8 shadow-xl sm:p-10">
        <div className="mb-8 text-center">
          <Link
            href="/"
            className="text-3xl font-extrabold text-[#142B49]"
          >
            In<span className="text-[#00BFAF]">Ship</span>
          </Link>

          <div className="mx-auto mt-7 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#E0F8F7] text-3xl">
            🔐
          </div>

          <h1 className="mt-5 text-3xl font-extrabold text-[#142B49]">
            Welcome Back!
          </h1>

          <p className="mt-2 text-gray-500">
            Login to manage your deliveries
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-sm font-semibold text-[#142B49]"
            >
              Email Address
            </label>

            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-gray-900 outline-none focus:border-[#00BFAF] focus:ring-2 focus:ring-[#00BFAF]/10"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-semibold text-[#142B49]"
            >
              Password
            </label>

            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full rounded-xl border border-gray-200 px-4 py-3 pr-16 text-gray-900 outline-none focus:border-[#00BFAF]"
              />

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-[#008F84]"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {error && (
            <p
              role="alert"
              className="rounded-xl bg-red-50 p-3 text-sm text-red-600"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-[#00BFAF] px-6 py-3.5 font-bold text-white shadow-sm transition hover:bg-[#009F93] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Logging in..." : "Login to InShip →"}
          </button>
        </form>

        <p className="mt-7 text-center text-sm text-gray-600">
          Don&apos;t have an account?{" "}
          <Link
            href="/signup"
            className="font-bold text-[#008F84] hover:underline"
          >
            Sign Up
          </Link>
        </p>

        <Link
          href="/"
          className="mt-5 block text-center text-sm text-gray-400 hover:text-[#008F84]"
        >
          ← Back to Home
        </Link>
      </div>
    </main>
  );
}
