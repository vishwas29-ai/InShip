import {
  randomInt,
  createHmac,
  timingSafeEqual,
} from "node:crypto";

function getOTPSecret(): string {
  const secret = process.env.OTP_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error("OTP_SECRET is missing or too short");
  }

  return secret;
}

export function generateOTP(): string {
  return randomInt(0, 1000000)
    .toString()
    .padStart(6, "0");
}

function compareHashes(
  generatedHash: string,
  storedHash: string
): boolean {
  const first = Buffer.from(generatedHash, "hex");
  const second = Buffer.from(storedHash, "hex");

  if (first.length !== second.length) {
    return false;
  }

  return timingSafeEqual(first, second);
}

// ==========================================
// EMAIL ACCOUNT VERIFICATION
// ==========================================

export function hashOTP(
  otp: string,
  userId: string,
  email: string
): string {
  return createHmac("sha256", getOTPSecret())
    .update(JSON.stringify([userId, email, otp]))
    .digest("hex");
}

export function verifyOTP(
  otp: string,
  userId: string,
  email: string,
  storedHash: string
): boolean {
  return compareHashes(
    hashOTP(otp, userId, email),
    storedHash
  );
}

// ==========================================
// PARCEL DELIVERY VERIFICATION
// ==========================================

export function hashDeliveryOTP(
  otp: string,
  orderId: string,
  assignmentId: string,
  email: string
): string {
  return createHmac("sha256", getOTPSecret())
    .update(
      JSON.stringify([
        "DELIVERY_OTP",
        orderId,
        assignmentId,
        email.trim().toLowerCase(),
        otp,
      ])
    )
    .digest("hex");
}

export function verifyDeliveryOTP(
  otp: string,
  orderId: string,
  assignmentId: string,
  email: string,
  storedHash: string
): boolean {
  return compareHashes(
    hashDeliveryOTP(
      otp,
      orderId,
      assignmentId,
      email
    ),
    storedHash
  );
}