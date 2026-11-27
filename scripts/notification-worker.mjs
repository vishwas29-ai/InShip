import nextEnv from "@next/env";
import pg from "pg";
import nodemailer from "nodemailer";

const { loadEnvConfig } = nextEnv;

loadEnvConfig(
  process.cwd(),
  process.env.NODE_ENV !== "production"
);

const {
  DIRECT_URL,
  SMTP_HOST,
  SMTP_USER,
  SMTP_PASS,
  SMTP_FROM,
} = process.env;

if (
  !DIRECT_URL ||
  !SMTP_HOST ||
  !SMTP_USER ||
  !SMTP_PASS
) {
  throw new Error(
    "Missing database or SMTP configuration"
  );
}

const port = Number(process.env.SMTP_PORT || 465);

const pool = new pg.Pool({
  connectionString: DIRECT_URL,
});

const mail = nodemailer.createTransport({
  host: SMTP_HOST,
  port,
  secure: port === 465,
  requireTLS: port !== 465,

  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },

  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 20000,
});

let stopping = false;

process.on("SIGINT", () => {
  stopping = true;
});

process.on("SIGTERM", () => {
  stopping = true;
});

const sleep = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms));

const escapeHtml = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character]
  );

const db = await pool.connect();

let locked = false;

try {
  // Prevent multiple workers from running together.

  const lock = await db.query(
    "SELECT pg_try_advisory_lock(91382471) AS locked"
  );

  locked = lock.rows[0].locked;

  if (!locked) {
    throw new Error(
      "Another notification worker is running"
    );
  }

  // Recover interrupted notification jobs.

  await db.query(
    `UPDATE "Notification"
     SET "status" = CASE
       WHEN "attempts" >= 3 THEN 'FAILED'
       ELSE 'PENDING'
     END
     WHERE "status" = 'PROCESSING'`
  );

  console.log(
    "InShip notification worker started"
  );

  while (!stopping) {
    // Fetch next pending notification.

    const result = await db.query(
      `UPDATE "Notification"
       SET
         "status" = 'PROCESSING',
         "attempts" = "attempts" + 1
       WHERE "id" = (
         SELECT "id"
         FROM "Notification"
         WHERE "status" = 'PENDING'
           AND "attempts" < 3
           AND "nextAttemptAt" <= NOW()
         ORDER BY "createdAt", "id"
         LIMIT 1
         FOR UPDATE SKIP LOCKED
       )
       RETURNING *`
    );

    const job = result.rows[0];

    if (!job) {
      await sleep(2000);
      continue;
    }

    try {
      const reference = String(job.orderId);

      await mail.sendMail({
        from: SMTP_FROM || SMTP_USER,

        to: job.recipientEmail,

        subject: job.subject,

        text: `
${job.message}

Order reference: ${reference}

Sign in to InShip to view your parcels.
        `,

        html: `
          <div style="
            font-family:Arial,sans-serif;
            max-width:520px;
            margin:auto;
            border:1px solid #DCEFEB;
            border-radius:16px;
            overflow:hidden;
          ">

            <div style="
              background:#008F84;
              color:white;
              padding:24px;
              text-align:center;
            ">
              <h1>InShip</h1>
              Smart Parcel Delivery
            </div>

            <div style="padding:24px;">

              <h2 style="color:#142B49;">
                ${escapeHtml(job.subject)}
              </h2>

              <p>
                ${escapeHtml(job.message)}
              </p>

              <div style="
                background:#F4FAFA;
                padding:18px;
                border-radius:12px;
              ">
                <strong>Order Reference</strong>

                <p style="word-break:break-all;">
                  ${escapeHtml(reference)}
                </p>
              </div>

              <p>
                Sign in to InShip to view your parcels.
              </p>

              <p style="color:#777;">
                Thank you for choosing InShip.
              </p>

            </div>

            <div style="
              background:#F4FAFA;
              padding:15px;
              text-align:center;
              color:#777;
              font-size:12px;
            ">
              InShip | Secure Parcel Delivery
            </div>

          </div>
        `,
      });

    } catch {
      // Retry failed emails after 60 seconds.

      await db.query(
        `UPDATE "Notification"
         SET
           "status" = CASE
             WHEN "attempts" >= 3 THEN 'FAILED'
             ELSE 'PENDING'
           END,
           "errorMessage" = 'SMTP send failed',
           "nextAttemptAt" =
             NOW() + INTERVAL '60 seconds'
         WHERE "id" = $1`,
        [job.id]
      );

      console.error(
        "Notification send failed:",
        job.id
      );

      continue;
    }

    // Mark successfully sent notification.

    await db.query(
      `UPDATE "Notification"
       SET
         "status" = 'SENT',
         "sentAt" = NOW(),
         "errorMessage" = NULL
       WHERE "id" = $1`,
      [job.id]
    );

    console.log(
      "Notification sent:",
      job.id
    );
  }

} finally {
  if (locked) {
    await db.query(
      "SELECT pg_advisory_unlock(91382471)"
    ).catch(() => {});
  }

  db.release();

  await pool.end();
}