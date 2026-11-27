
import "server-only";
import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "node:crypto";
import { connection } from "next/server";

const COOKIE_NAME = "inship_session";
const SESSION_AGE = 60 * 60 * 24 * 7;

function getSecret() {
  const secret = process.env.AUTH_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error("AUTH_SECRET must contain at least 32 characters");
  }

  return secret;
}

function encodeBase64Url(value: string) {
  return Buffer.from(value).toString("base64url");
}

function signToken(payload: Record<string, unknown>) {
  const header = encodeBase64Url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = encodeBase64Url(JSON.stringify(payload));
  const unsignedToken = `${header}.${body}`;
  const signature = createHmac("sha256", getSecret())
    .update(unsignedToken)
    .digest("base64url");

  return `${unsignedToken}.${signature}`;
}

function verifyToken(token: string): Record<string, unknown> | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [header, body, signature] = parts;
  const unsignedToken = `${header}.${body}`;
  const expected = createHmac("sha256", getSecret())
    .update(unsignedToken)
    .digest("base64url");

  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const headerPayload = JSON.parse(Buffer.from(header, "base64url").toString("utf8"));
    if (headerPayload.alg !== "HS256") return null;

    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (typeof payload.exp === "number" && payload.exp * 1000 <= Date.now()) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export async function createSession(userId: string) {
  const now = Math.floor(Date.now() / 1000);
  const token = signToken({
    sub: userId,
    iat: now,
    exp: now + SESSION_AGE,
  });

  const cookieStore = await cookies();

  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_AGE,
  });
}


export async function getSessionUserId() {
  // Wait for an actual incoming request
  await connection();

  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  try {
    const payload = verifyToken(token);
    const userId = payload?.sub;

    return typeof userId === "string" ? userId : null;
  } catch {
    return null;
  }
}


export async function deleteSession() {
  const cookieStore = await cookies();

  cookieStore.delete(COOKIE_NAME);
}
