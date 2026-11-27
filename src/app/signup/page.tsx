
"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function updateField(
    field: keyof typeof form,
    value: string
  ) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError("");
  }

  async function handleSignup(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!/^[6-9]\d{9}$/.test(form.phone)) {
      setError("Enter a valid 10-digit Indian mobile number.");
      return;
    }

    if (form.password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: form.fullName,
          email: form.email,
          phone: form.phone,
          password: form.password,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Signup failed");
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong"
      );
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "w-full rounded-xl border border-gray-200 px-4 py-3 text-gray-900 outline-none focus:border-[#00BFAF] focus:ring-2 focus:ring-[#00BFAF]/10";

  const labelClass =
    "mb-2 block text-sm font-semibold text-[#142B49]";

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#E0F8F7] via-[#F4FAFA] to-white px-5 py-12">
      <div className="w-full max-w-lg rounded-3xl border border-[#DCEFEB] bg-white p-8 shadow-xl sm:p-10">
        <div className="mb-8 text-center">
          <Link href="/" className="text-3xl font-extrabold text-[#142B49]">
            In<span className="text-[#00BFAF]">Ship</span>
          </Link>

          <h1 className="mt-7 text-3xl font-extrabold text-[#142B49]">
            Create Your Account
          </h1>

          <p className="mt-2 text-gray-500">
            Join InShip for smarter deliveries
          </p>
        </div>

        <form onSubmit={handleSignup} className="space-y-5">
          <div>
            <label htmlFor="fullName" className={labelClass}>
              Full Name
            </label>
            <input
              id="fullName"
              type="text"
              required
              minLength={2}
              maxLength={100}
              autoComplete="name"
              value={form.fullName}
              onChange={(e) => updateField("fullName", e.target.value)}
              placeholder="Enter your full name"
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="email" className={labelClass}>
              Email Address
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={form.email}
              onChange={(e) => updateField("email", e.target.value)}
              placeholder="Enter your email"
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="phone" className={labelClass}>
              Phone Number
            </label>
            <input
              id="phone"
              type="tel"
              inputMode="numeric"
              maxLength={10}
              required
              autoComplete="tel"
              value={form.phone}
              onChange={(e) =>
                updateField(
                  "phone",
                  e.target.value.replace(/\D/g, "")
                )
              }
              placeholder="10-digit mobile number"
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="password" className={labelClass}>
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                required
                minLength={8}
                maxLength={128}
                autoComplete="new-password"
                value={form.password}
                onChange={(e) => updateField("password", e.target.value)}
                placeholder="Minimum 8 characters"
                className={`${inputClass} pr-16`}
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

          <div>
            <label htmlFor="confirmPassword" className={labelClass}>
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type={showPassword ? "text" : "password"}
              required
              autoComplete="new-password"
              value={form.confirmPassword}
              onChange={(e) =>
                updateField("confirmPassword", e.target.value)
              }
              placeholder="Re-enter your password"
              className={inputClass}
            />
          </div>

          {error && (
            <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-600">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-[#00BFAF] px-6 py-3.5 font-bold text-white transition hover:bg-[#009F93] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Creating Account..." : "Create Account →"}
          </button>
        </form>

        <p className="mt-7 text-center text-sm text-gray-600">
          Already have an account?{" "}
          <Link href="/login" className="font-bold text-[#008F84] hover:underline">
            Login
          </Link>
        </p>

        <Link href="/" className="mt-5 block text-center text-sm text-gray-400 hover:text-[#008F84]">
          ← Back to Home
        </Link>
      </div>
    </main>
  );
}
