"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type Order = {
  id: string;
  pickupAddress: string;
  deliveryAddress: string;
  receiverName: string | null;
  receiverPhone: string | null;
  receiverEmail: string | null;
  totalCharge: number;
  status: string;
  createdAt: string;
};

type Agent = {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
};

type AssignmentType = "PICKUP" | "DELIVERY";

type Assignment = {
  id: string;
  orderId: string;
  agentId: string;
  agentName: string;
  type: AssignmentType;
  status: string;
  assignedAt: string;
};

type Message = {
  text: string;
  success: boolean;
};

export default function AdminDashboardClient() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [selectedAgents, setSelectedAgents] = useState<
    Record<string, string>
  >({});

  const [assigning, setAssigning] = useState<string | null>(null);

  const [updatingStatus, setUpdatingStatus] = useState<
    string | null
  >(null);

  const [messages, setMessages] = useState<
    Record<string, Message>
  >({});

  const loadDashboard = useCallback(async (refresh = false) => {
    try {
      if (refresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const [ordersResponse, agentsResponse] = await Promise.all([
        fetch("/api/orders", { cache: "no-store" }),
        fetch("/api/admin/assign-agent", {
          cache: "no-store",
        }),
      ]);

      const ordersData = await ordersResponse.json();
      const agentsData = await agentsResponse.json();

      if (
        !ordersResponse.ok ||
        !ordersData.success ||
        !Array.isArray(ordersData.orders)
      ) {
        throw new Error(
          ordersData.error || "Unable to fetch orders"
        );
      }

      if (
        !agentsResponse.ok ||
        !agentsData.success ||
        !Array.isArray(agentsData.agents) ||
        !Array.isArray(agentsData.assignments)
      ) {
        throw new Error(
          agentsData.error || "Unable to fetch agents"
        );
      }

      setOrders(ordersData.orders);
      setAgents(agentsData.agents);
      setAssignments(agentsData.assignments);
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
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const stats = [
    {
      label: "Total Orders",
      value: orders.length,
      icon: "📦",
    },
    {
      label: "Pending",
      value: orders.filter(
        (order) => order.status === "PLACED"
      ).length,
      icon: "⏳",
    },
    {
      label: "In Transit",
      value: orders.filter(
        (order) => order.status === "IN_TRANSIT"
      ).length,
      icon: "🚚",
    },
    {
      label: "Completed",
      value: orders.filter(
        (order) => order.status === "COMPLETED"
      ).length,
      icon: "✅",
    },
  ];

  function getAssignment(
    orderId: string,
    type: AssignmentType
  ) {
    return assignments.find(
      (assignment) =>
        assignment.orderId === orderId &&
        assignment.type === type
    );
  }

  function getSelectionKey(
    orderId: string,
    type: AssignmentType
  ) {
    return `${orderId}:${type}`;
  }

  function getStatusStyle(status: string) {
    switch (status) {
      case "PLACED":
        return "bg-amber-100 text-amber-800";

      case "ACCEPTED":
        return "bg-teal-100 text-teal-800";

      case "IN_TRANSIT":
        return "bg-blue-100 text-blue-800";

      case "COMPLETED":
        return "bg-green-100 text-green-800";

      case "CANCELLED":
        return "bg-red-100 text-red-800";

      default:
        return "bg-gray-100 text-gray-700";
    }
  }

  async function updateOrderStatus(
    orderId: string,
    newStatus: "IN_TRANSIT" | "CANCELLED"
  ) {
    const action =
      newStatus === "IN_TRANSIT"
        ? "dispatch this parcel"
        : "cancel this order";

    if (
      !window.confirm(
        `Are you sure you want to ${action}?`
      )
    ) {
      return;
    }

    setUpdatingStatus(orderId);

    setMessages((previous) => ({
      ...previous,
      [`${orderId}:status`]: {
        text: "",
        success: false,
      },
    }));

    try {
      const response = await fetch(
        `/api/orders/${encodeURIComponent(orderId)}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status: newStatus,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error || "Unable to update order status"
        );
      }

      setOrders((previous) =>
        previous.map((order) =>
          order.id === orderId
            ? {
                ...order,
                status: data.order?.status ?? newStatus,
              }
            : order
        )
      );

      if (newStatus === "CANCELLED") {
        setAssignments((previous) =>
          previous.map((assignment) =>
            assignment.orderId === orderId &&
            assignment.status === "ASSIGNED"
              ? {
                  ...assignment,
                  status: "CANCELLED",
                }
              : assignment
          )
        );
      }

      setMessages((previous) => ({
        ...previous,
        [`${orderId}:status`]: {
          text:
            data.message ||
            "Status updated successfully",
          success: true,
        },
      }));
    } catch (err) {
      setMessages((previous) => ({
        ...previous,
        [`${orderId}:status`]: {
          text:
            err instanceof Error
              ? err.message
              : "Something went wrong",
          success: false,
        },
      }));
    } finally {
      setUpdatingStatus(null);
    }
  }

  async function assignAgent(
    orderId: string,
    type: AssignmentType
  ) {
    const key = getSelectionKey(orderId, type);
    const agentId = selectedAgents[key];

    if (!agentId) {
      setMessages((previous) => ({
        ...previous,
        [key]: {
          text: "Please select an agent first.",
          success: false,
        },
      }));

      return;
    }

    setAssigning(key);

    setMessages((previous) => ({
      ...previous,
      [key]: {
        text: "",
        success: false,
      },
    }));

    try {
      const response = await fetch(
        "/api/admin/assign-agent",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            orderId,
            agentId,
            type,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error || "Unable to assign agent"
        );
      }

      const assignedAgent = agents.find(
        (agent) => agent.id === agentId
      );

      const newAssignment: Assignment = {
        ...data.assignment,
        agentName:
          assignedAgent?.fullName || "Assigned Agent",
      };

      setAssignments((previous) => [
        ...previous,
        newAssignment,
      ]);

      setMessages((previous) => ({
        ...previous,
        [key]: {
          text: `${
            type === "PICKUP" ? "Pickup" : "Delivery"
          } agent assigned successfully!`,
          success: true,
        },
      }));
    } catch (err) {
      setMessages((previous) => ({
        ...previous,
        [key]: {
          text:
            err instanceof Error
              ? err.message
              : "Something went wrong",
          success: false,
        },
      }));
    } finally {
      setAssigning(null);
    }
  }

  function renderAssignmentPanel(
    orderId: string,
    type: AssignmentType,
    orderStatus: string
  ) {
    const existing = getAssignment(orderId, type);
    const key = getSelectionKey(orderId, type);
    const message = messages[key];

    const title =
      type === "PICKUP"
        ? "Pickup Agent"
        : "Delivery Agent";

    const isClosed =
      orderStatus === "COMPLETED" ||
      orderStatus === "CANCELLED";

    const canAssign =
      !isClosed &&
      (type === "PICKUP"
        ? orderStatus === "PLACED"
        : ["PLACED", "ACCEPTED", "IN_TRANSIT"].includes(
            orderStatus
          ));

    return (
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
        <h4 className="mb-3 font-semibold text-gray-900">
          {type === "PICKUP" ? "📦" : "🚚"} {title}
        </h4>

        {existing ? (
          <div
            className={`rounded-lg border p-3 ${
              existing.status === "CANCELLED"
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-green-200 bg-green-50 text-green-800"
            }`}
          >
            <p className="font-semibold">
              {existing.agentName}
            </p>

            <p className="mt-1 text-xs">
              Status:{" "}
              {existing.status.replaceAll("_", " ")}
            </p>
          </div>
        ) : !canAssign ? (
          <p className="rounded-lg bg-gray-100 p-3 text-sm text-gray-500">
            Assignment unavailable for this order status.
          </p>
        ) : (
          <>
            <select
              value={selectedAgents[key] || ""}
              onChange={(event) =>
                setSelectedAgents((previous) => ({
                  ...previous,
                  [key]: event.target.value,
                }))
              }
              disabled={assigning !== null}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
            >
              <option value="">
                Select {title}
              </option>

              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.fullName} ({agent.email})
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() =>
                void assignAgent(orderId, type)
              }
              disabled={
                assigning !== null ||
                !selectedAgents[key] ||
                agents.length === 0
              }
              className="mt-3 w-full rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {assigning === key
                ? "Assigning..."
                : `Assign ${title}`}
            </button>

            {agents.length === 0 && (
              <p className="mt-2 text-xs text-amber-700">
                No agents found. Register an agent first.
              </p>
            )}
          </>
        )}

        {message?.text && (
          <p
            role="status"
            className={`mt-2 text-sm ${
              message.success
                ? "text-green-700"
                : "text-red-600"
            }`}
          >
            {message.text}
          </p>
        )}
      </div>
    );
  }

  function renderStatusActions(order: Order) {
    const statusMessage =
      messages[`${order.id}:status`];

    const isUpdating =
      updatingStatus === order.id;

    const pickupAssignment = getAssignment(
      order.id,
      "PICKUP"
    );

    const pickupCompleted =
      pickupAssignment?.status === "COMPLETED";

    return (
      <div className="mt-4 space-y-3">
        {order.status === "PLACED" && (
          <button
            type="button"
            onClick={() =>
              void updateOrderStatus(
                order.id,
                "CANCELLED"
              )
            }
            disabled={updatingStatus !== null}
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
          >
            {isUpdating
              ? "Updating..."
              : "Cancel Order"}
          </button>
        )}

        {order.status === "ACCEPTED" && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                void updateOrderStatus(
                  order.id,
                  "IN_TRANSIT"
                )
              }
              disabled={
                updatingStatus !== null ||
                !pickupCompleted
              }
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isUpdating
                ? "Updating..."
                : "🚚 Dispatch Parcel"}
            </button>

            <button
              type="button"
              onClick={() =>
                void updateOrderStatus(
                  order.id,
                  "CANCELLED"
                )
              }
              disabled={updatingStatus !== null}
              className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
            >
              Cancel Order
            </button>

            {!pickupCompleted && (
              <p className="w-full text-xs text-amber-700">
                Pickup Agent must complete pickup before
                dispatch.
              </p>
            )}
          </div>
        )}

        {order.status === "IN_TRANSIT" && (
          <p className="rounded-lg bg-blue-50 p-3 text-sm text-blue-700">
            🚚 Parcel is in transit. The assigned Delivery
            Agent must mark it as delivered.
          </p>
        )}

        {order.status === "COMPLETED" && (
          <p className="rounded-lg bg-green-50 p-3 text-sm text-green-700">
            ✓ Parcel delivered successfully.
          </p>
        )}

        {order.status === "CANCELLED" && (
          <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
            This order has been cancelled.
          </p>
        )}

        {statusMessage?.text && (
          <p
            role="status"
            className={`rounded-lg p-3 text-sm ${
              statusMessage.success
                ? "bg-green-50 text-green-700"
                : "bg-red-50 text-red-700"
            }`}
          >
            {statusMessage.text}
          </p>
        )}
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">
            InShip Admin Dashboard
          </h1>

          <p className="mt-2 text-gray-500">
            Manage delivery orders and monitor operations.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadDashboard(true)}
          disabled={loading || refreshing}
          className="rounded-lg border border-teal-200 bg-white px-4 py-2 text-sm font-semibold text-teal-700 hover:bg-teal-50 disabled:opacity-50"
        >
          {refreshing
            ? "Refreshing..."
            : "↻ Refresh Dashboard"}
        </button>
      </div>

      {loading && <p>Loading dashboard...</p>}

      {error && (
        <p className="rounded-lg bg-red-50 p-4 text-red-600">
          {error}
        </p>
      )}

      {!loading && !error && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl border bg-white p-5 shadow-sm"
              >
                <p className="text-2xl">{stat.icon}</p>

                <p className="mt-3 text-sm text-gray-500">
                  {stat.label}
                </p>

                <p className="mt-2 text-3xl font-bold text-blue-600">
                  {stat.value}
                </p>
              </div>
            ))}
          </div>

          <h2 className="mb-5 mt-10 text-2xl font-bold">
            All Orders
          </h2>

          {orders.length === 0 ? (
            <p className="text-gray-500">
              No orders available.
            </p>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="rounded-xl border bg-white p-5 shadow-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs text-gray-500">
                        ORDER ID
                      </p>

                      <p className="break-all font-mono text-sm">
                        {order.id}
                      </p>
                    </div>

                    <span
                      className={`rounded-full px-3 py-1 text-sm font-semibold ${getStatusStyle(
                        order.status
                      )}`}
                    >
                      {order.status.replaceAll("_", " ")}
                    </span>
                  </div>

                  {/* Parcel Route */}

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <p>
                      <strong>Pickup:</strong>{" "}
                      {order.pickupAddress}
                    </p>

                    <p>
                      <strong>Delivery:</strong>{" "}
                      {order.deliveryAddress}
                    </p>
                  </div>

                  {/* Receiver Details */}

                  <div className="mt-5 rounded-xl border border-teal-100 bg-teal-50 p-4">
                    <h3 className="mb-4 font-bold text-gray-900">
                      👤 Receiver Details
                    </h3>

                    <div className="grid gap-4 sm:grid-cols-3">
                      <div>
                        <p className="text-xs text-gray-500">
                          Receiver Name
                        </p>

                        <p className="mt-1 break-words font-semibold text-gray-900">
                          {order.receiverName ||
                            "Not provided"}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-gray-500">
                          Mobile Number
                        </p>

                        {order.receiverPhone ? (
                          <a
                            href={`tel:+91${order.receiverPhone}`}
                            className="mt-1 inline-block font-semibold text-teal-700 hover:underline"
                          >
                            +91 {order.receiverPhone}
                          </a>
                        ) : (
                          <p className="mt-1 text-gray-500">
                            Not provided
                          </p>
                        )}
                      </div>

                      <div>
                        <p className="text-xs text-gray-500">
                          Email Address
                        </p>

                        <p className="mt-1 break-all font-semibold text-gray-900">
                          {order.receiverEmail ||
                            "Not provided"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Order Actions */}

                  <div className="mt-5 border-t pt-4">
                    <h3 className="text-sm font-bold text-gray-900">
                      Order Actions
                    </h3>

                    {renderStatusActions(order)}
                  </div>

                  {/* Agent Assignment */}

                  <div className="mt-6 border-t pt-5">
                    <h3 className="mb-4 text-lg font-bold text-gray-900">
                      Agent Assignment
                    </h3>

                    <div className="grid gap-4 md:grid-cols-2">
                      {renderAssignmentPanel(
                        order.id,
                        "PICKUP",
                        order.status
                      )}

                      {renderAssignmentPanel(
                        order.id,
                        "DELIVERY",
                        order.status
                      )}
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
                    <p className="text-xl font-bold text-blue-600">
                      ₹
                      {Number(
                        order.totalCharge
                      ).toLocaleString("en-IN")}
                    </p>

                    <Link
                      href={`/orders/${encodeURIComponent(
                        order.id
                      )}`}
                      className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
                    >
                      View Order
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </main>
  );
}