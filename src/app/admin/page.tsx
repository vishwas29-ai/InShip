import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/auth";
import { authPool } from "@/lib/auth-db";
import AdminDashboardClient from "./AdminDashboardClient";

type UserRow = {
  id: string;
  role: "CUSTOMER" | "AGENT" | "ADMIN";
};

async function AdminDashboardContent() {

  const userId = await getSessionUserId();

  if (!userId) {
    redirect("/login");
  }

  const result = await authPool.query<UserRow>(
    `SELECT "id", "role"
     FROM "User"
     WHERE "id" = $1
     LIMIT 1`,
    [userId]
  );

  const user = result.rows[0];

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "ADMIN") {
    redirect(
      user.role === "AGENT"
        ? "/agent/dashboard"
        : "/dashboard"
    );
  }

  return <AdminDashboardClient />;
}

export default function AdminPage() {
  return (
    <div className="admin-dashboard min-h-screen bg-[#F4FAFA] text-[#142B49]">

      <Suspense
        fallback={
          <main className="mx-auto max-w-6xl px-6 py-10">

            <div className="rounded-2xl border border-teal-100 bg-white p-8 text-center shadow-sm">

              <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-teal-100 border-t-teal-600" />

              <h2 className="text-xl font-bold text-[#142B49]">
                Loading Admin Dashboard
              </h2>

              <p className="mt-2 text-sm text-slate-600">
                Please wait while we fetch your orders.
              </p>

            </div>

          </main>
        }
      >
        <AdminDashboardContent />
      </Suspense>

    </div>
  );
}