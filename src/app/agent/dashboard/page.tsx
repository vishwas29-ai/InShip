
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/auth";
import { authPool } from "@/lib/auth-db";
import AgentDashboardClient from "./AgentDashboardClient";

type UserRow = {
  id: string;
  fullName: string;
  email: string;
  role: "CUSTOMER" | "AGENT" | "ADMIN";
};

// This component performs request-time authentication
async function AgentDashboardContent() {
  // Step 1: Get logged-in user ID
  const userId = await getSessionUserId();

  if (!userId) {
    redirect("/login");
  }

  // Step 2: Get user role from Neon
  const result = await authPool.query<UserRow>(
    `SELECT "id", "fullName", "email", "role"
     FROM "User"
     WHERE "id" = $1
     LIMIT 1`,
    [userId]
  );

  const user = result.rows[0];

  if (!user) {
    redirect("/login");
  }

  // Step 3: Allow only AGENT
  if (user.role !== "AGENT") {
    redirect(
      user.role === "ADMIN"
        ? "/admin"
        : "/dashboard"
    );
  }

  // Step 4: Render Agent Dashboard
 return <AgentDashboardClient />;
}

// Suspense boundary for request-dependent content
export default function AgentDashboardPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#F4FAFA] px-5 py-10">
          <p className="text-gray-600">
            Loading Agent Dashboard...
          </p>
        </main>
      }
    >
      <AgentDashboardContent />
    </Suspense>
  );
}
