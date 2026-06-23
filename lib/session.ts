import { cookies } from "next/headers";

const SESSION_COOKIE = "hailey_session";
const SECRET = process.env.SESSION_SECRET || "dev-secret-change-in-prod";

export interface SessionPayload {
  ownerId: string;
  businessId: string;
  email: string;
  businessName: string;
}

async function sign(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

async function verify(payload: string, signature: string, secret: string): Promise<boolean> {
  const expected = await sign(payload, secret);
  return expected === signature;
}

export async function createSession(data: SessionPayload): Promise<string> {
  const payload = btoa(JSON.stringify(data));
  const sig = await sign(payload, SECRET);
  return `${payload}.${sig}`;
}

export async function parseSession(token: string): Promise<SessionPayload | null> {
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const valid = await verify(payload, sig, SECRET);
  if (!valid) return null;
  try {
    return JSON.parse(atob(payload)) as SessionPayload;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return parseSession(token);
}

export function sessionCookieOptions(token: string) {
  return {
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  };
}

export function clearSessionCookie() {
  return {
    name: SESSION_COOKIE,
    value: "",
    maxAge: 0,
    path: "/",
  };
}
