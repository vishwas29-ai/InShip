import nodemailer from "nodemailer";

function createTransporter() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const port = Number(process.env.SMTP_PORT || 465);

  if (!host || !user || !pass) {
    throw new Error("SMTP configuration is missing");
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    requireTLS: port !== 465,
    auth: {
      user,
      pass,
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 20000,
  });
}

function createEmailTemplate(
  title: string,
  description: string,
  otp: string,
  validity: number,
  warning: string
) {
  return `
    <div style="
      max-width:500px;
      margin:auto;
      font-family:Arial,sans-serif;
      border:1px solid #DCEFEB;
      border-radius:16px;
      overflow:hidden;
    ">

      <div style="
        background:#008F84;
        color:white;
        padding:25px;
        text-align:center;
      ">
        <h1>InShip</h1>
        <p>Smart Parcel Delivery</p>
      </div>

      <div style="padding:30px;text-align:center;">

        <h2 style="color:#142B49;">
          ${title}
        </h2>

        <p style="color:#555;line-height:1.6;">
          ${description}
        </p>

        <div style="
          background:#E0F8F7;
          color:#008F84;
          padding:20px;
          border-radius:12px;
          font-size:32px;
          font-weight:bold;
          letter-spacing:8px;
          margin:25px 0;
        ">
          ${otp}
        </div>

        <p>
          This code expires in ${validity} minutes.
        </p>

        <p style="
          color:#777;
          font-size:13px;
          line-height:1.6;
        ">
          ${warning}
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
  `;
}

// ==========================================
// ACCOUNT VERIFICATION EMAIL
// ==========================================

export async function sendVerificationEmail(
  email: string,
  otp: string
) {
  const transporter = createTransporter();

  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,

    to: email,

    subject: "InShip - Verify Your Email",

    text:
      `Your InShip verification code is ${otp}. ` +
      "It expires in 5 minutes. Do not share this code.",

    html: createEmailTemplate(
      "Verify Your Email",
      "Use this verification code to securely link your incoming parcels.",
      otp,
      5,
      "Never share this verification code with anyone. If you did not request it, ignore this email."
    ),
  });
}

// ==========================================
// DELIVERY OTP EMAIL
// ==========================================

export async function sendDeliveryOTPEmail(
  email: string,
  otp: string,
  orderId: string
) {
  const transporter = createTransporter();

  const shortOrderId = orderId
    .replace(/[^a-zA-Z0-9-]/g, "")
    .slice(0, 12);

  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,

    to: email,

    subject: `InShip - Delivery OTP | ${shortOrderId}`,

    text:
      `Your delivery OTP is ${otp}. ` +
      `Order reference: ${shortOrderId}. ` +
      "This code expires in 10 minutes. " +
      "Share it with the assigned delivery agent only when you receive your parcel.",

    html: createEmailTemplate(
      "Confirm Your Parcel Delivery",
      `Your delivery verification code for order <strong>${shortOrderId}</strong> is shown below.`,
      otp,
      10,
      "Share this code with the assigned delivery agent only when you physically receive your parcel. Never share it over a phone call before delivery."
    ),
  });
}