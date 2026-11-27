import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";

const events: Record<
  string,
  {
    subject: string;
    message: string;
    sender: boolean;
    receiver: boolean;
  }
> = {
  PLACED: {
    subject: "Parcel booked",
    message: "Your parcel booking has been created.",
    sender: true,
    receiver: true,
  },

  PICKUP_ASSIGNED: {
    subject: "Pickup agent assigned",
    message: "A pickup agent has been assigned to your parcel.",
    sender: true,
    receiver: false,
  },

  ACCEPTED: {
    subject: "Parcel picked up",
    message: "Your parcel has been collected.",
    sender: true,
    receiver: true,
  },

  IN_TRANSIT: {
    subject: "Parcel dispatched",
    message: "Your parcel is now in transit.",
    sender: true,
    receiver: true,
  },

  DELIVERY_ASSIGNED: {
    subject: "Delivery agent assigned",
    message: "A delivery agent has been assigned to your parcel.",
    sender: false,
    receiver: true,
  },

  COMPLETED: {
    subject: "Parcel delivered",
    message: "Your parcel has been delivered successfully.",
    sender: true,
    receiver: true,
  },

  CANCELLED: {
    subject: "Parcel cancelled",
    message: "Your parcel booking has been cancelled.",
    sender: true,
    receiver: true,
  },
};

export async function queueOrderNotifications(
  client: PoolClient,
  orderId: string,
  type: string
) {
  const event = events[type];

  if (!event) {
    throw new Error("Unknown notification event");
  }

  const result = await client.query<{
    senderEmail: string | null;
    receiverEmail: string | null;
  }>(
    `SELECT
       u."email" AS "senderEmail",
       o."receiverEmail"
     FROM "Order" o
     LEFT JOIN "User" u
       ON u."id" = o."senderId"
     WHERE o."id" = $1`,
    [orderId]
  );

  const order = result.rows[0];

  if (!order) {
    throw new Error("Notification order not found");
  }

  const recipients = new Set<string>();

  for (const email of [
    event.sender ? order.senderEmail : null,
    event.receiver ? order.receiverEmail : null,
  ]) {
    const normalized = email?.trim().toLowerCase();

    if (
      normalized &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)
    ) {
      recipients.add(normalized);
    }
  }

  for (const email of recipients) {
    await client.query(
      `INSERT INTO "Notification" (
         "id",
         "orderId",
         "recipientEmail",
         "type",
         "subject",
         "message"
       )
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        randomUUID(),
        orderId,
        email,
        type,
        `InShip - ${event.subject}`,
        event.message,
      ]
    );
  }
}