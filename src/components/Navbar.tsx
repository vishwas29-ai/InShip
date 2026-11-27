
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type User = {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
};

const navigationLinks = [
  { name: "Home", href: "/" },
  { name: "Dashboard", href: "/dashboard" },
  { name: "My Orders", href: "/orders" },
  { name: "Track Order", href: "/#track" },
  { name: "Services", href: "/services" },
  { name: "About Us", href: "/about" },
  { name: "How It Works", href: "/#how-it-works" },
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();

  const [menuOpen, setMenuOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadUser() {
      try {
        const response = await fetch("/api/auth/me", {
          cache: "no-store",
        });

        if (!active) return;

        if (!response.ok) {
          setUser(null);
          return;
        }

        const data = await response.json();

        if (active) {
          setUser(data.success ? data.user : null);
        }
      } catch (error) {
        console.error("Failed to load user:", error);

        if (active) {
          setUser(null);
        }
      } finally {
        if (active) {
          setAuthLoading(false);
        }
      }
    }

    loadUser();

    return () => {
      active = false;
    };
  }, [pathname]);

  function isActiveLink(href: string) {
    if (href === "/") {
      return pathname === "/";
    }

    if (href.startsWith("/#")) {
      return false;
    }

    return (
      pathname === href ||
      pathname.startsWith(`${href}/`)
    );
  }

  async function handleLogout() {
    if (logoutLoading) return;

    setLogoutLoading(true);
    setAuthError("");

    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Unable to logout.");
      }

      setUser(null);
      setMenuOpen(false);

      router.replace("/");
      router.refresh();
    } catch (error) {
      console.error("Logout failed:", error);
      setAuthError("Logout failed. Please try again.");
    } finally {
      setLogoutLoading(false);
    }
  }

  const firstName =
    user?.fullName?.trim().split(/\s+/)[0] || "User";

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#E1F0EF] bg-white/95 shadow-sm backdrop-blur-md">
      <nav className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-6">

        {/* LOGO */}
        <Link
          href="/"
          onClick={() => setMenuOpen(false)}
          className="flex shrink-0 items-center gap-2"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#00BFAF] text-xl font-bold text-white shadow-sm">
            ↗
          </div>

          <span className="text-2xl font-extrabold tracking-tight text-[#142B49]">
            In
            <span className="text-[#00BFAF]">
              Ship
            </span>
          </span>
        </Link>

        {/* DESKTOP NAVIGATION */}
        <div className="hidden items-center gap-4 xl:flex">
          {navigationLinks.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={`whitespace-nowrap text-sm font-semibold transition-colors duration-200 ${
                isActiveLink(item.href)
                  ? "text-[#00BFAF]"
                  : "text-gray-600 hover:text-[#00BFAF]"
              }`}
            >
              {item.name}
            </Link>
          ))}
        </div>

        {/* DESKTOP AUTH BUTTONS */}
        <div className="hidden items-center gap-3 xl:flex">

          {authLoading ? (
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-200 border-t-[#00BFAF]" />
              Loading...
            </div>
          ) : user ? (
            <>
              {/* USER NAME */}
              <Link
                href="/dashboard"
                className="flex items-center gap-2 rounded-xl bg-[#E0F8F7] px-4 py-2.5 text-sm font-bold text-[#008F84] transition hover:bg-[#CFF2EF]"
              >
                <span>👋</span>
                <span>Hi, {firstName}</span>
              </Link>

              {/* LOGOUT */}
              <button
                type="button"
                onClick={handleLogout}
                disabled={logoutLoading}
                className="rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-60"
              >
                {logoutLoading ? "Logging out..." : "Logout"}
              </button>
            </>
          ) : (
            <>
              {/* LOGIN */}
              <Link
                href="/login"
                className="whitespace-nowrap text-sm font-semibold text-[#142B49] transition hover:text-[#00BFAF]"
              >
                Login
              </Link>

              {/* SIGNUP */}
              <Link
                href="/signup"
                className="whitespace-nowrap rounded-lg border border-[#00BFAF] px-4 py-2 text-sm font-semibold text-[#008F84] transition hover:bg-[#E0F8F7]"
              >
                Sign Up
              </Link>
            </>
          )}

          {/* BOOK DELIVERY - ALWAYS VISIBLE */}
          <Link
            href="/orders/new"
            className="whitespace-nowrap rounded-xl bg-[#00BFAF] px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#009F93] hover:shadow-md"
          >
            Book Delivery →
          </Link>
        </div>

        {/* MOBILE MENU BUTTON */}
        <button
          type="button"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          aria-controls="mobile-navigation"
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 text-xl text-[#142B49] transition hover:bg-[#E0F8F7] xl:hidden"
        >
          {menuOpen ? "✕" : "☰"}
        </button>
      </nav>

      {/* MOBILE NAVIGATION */}
      {menuOpen && (
        <div
          id="mobile-navigation"
          className="max-h-[80vh] overflow-y-auto border-t border-gray-100 bg-white px-5 py-5 shadow-lg xl:hidden"
        >
          <div className="mx-auto max-w-7xl space-y-1">

            {/* MOBILE LINKS */}
            {navigationLinks.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className={`block rounded-xl px-4 py-3 text-sm font-semibold transition ${
                  isActiveLink(item.href)
                    ? "bg-[#E0F8F7] text-[#008F84]"
                    : "text-[#142B49] hover:bg-[#F4FAFA]"
                }`}
              >
                {item.name}
              </Link>
            ))}

            <div className="my-4 border-t border-gray-100" />

            {/* MOBILE AUTH */}
            {authLoading ? (
              <p className="px-4 py-3 text-sm text-gray-400">
                Loading account...
              </p>
            ) : user ? (
              <>
                {/* USER PROFILE */}
                <Link
                  href="/dashboard"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 rounded-xl bg-[#E0F8F7] px-4 py-4"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#00BFAF] text-lg font-bold text-white">
                    {firstName.charAt(0).toUpperCase()}
                  </div>

                  <div className="min-w-0">
                    <p className="font-bold text-[#142B49]">
                      Hi, {firstName} 👋
                    </p>

                    <p className="truncate text-xs text-gray-500">
                      {user.email}
                    </p>
                  </div>
                </Link>

                {/* LOGOUT */}
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={logoutLoading}
                  className="block w-full rounded-xl px-4 py-3 text-left text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-60"
                >
                  {logoutLoading ? "Logging out..." : "Logout"}
                </button>
              </>
            ) : (
              <>
                {/* LOGIN */}
                <Link
                  href="/login"
                  onClick={() => setMenuOpen(false)}
                  className="block rounded-xl px-4 py-3 text-sm font-semibold text-[#142B49] hover:bg-[#F4FAFA]"
                >
                  Login
                </Link>

                {/* SIGNUP */}
                <Link
                  href="/signup"
                  onClick={() => setMenuOpen(false)}
                  className="block rounded-xl px-4 py-3 text-sm font-semibold text-[#142B49] hover:bg-[#F4FAFA]"
                >
                  Sign Up
                </Link>
              </>
            )}

            {/* BOOK DELIVERY */}
            <Link
              href="/orders/new"
              onClick={() => setMenuOpen(false)}
              className="mt-4 block rounded-xl bg-[#00BFAF] px-5 py-3.5 text-center text-sm font-bold text-white transition hover:bg-[#009F93]"
            >
              Book Delivery →
            </Link>
          </div>
        </div>
      )}

      {/* AUTH ERROR */}
      {authError && (
        <p
          role="alert"
          className="border-t border-red-100 bg-red-50 px-6 py-2 text-center text-sm text-red-600"
        >
          {authError}
        </p>
      )}
    </header>
  );
}
