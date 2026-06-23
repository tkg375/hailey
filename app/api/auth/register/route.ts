import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getDb, generateId } from "@/lib/db";
import { createSession, sessionCookieOptions } from "@/lib/session";

// Registration is closed — private beta only
const REGISTRATION_OPEN = false;

export const dynamic = "force-dynamic";

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export async function POST(req: NextRequest) {
  if (!REGISTRATION_OPEN) {
    return NextResponse.json({ error: "Registration is currently closed. Hailey is in private beta." }, { status: 403 });
  }
  try {
  const { businessName, industry, ownerName, email, password, phone } = await req.json() as any;

  if (!businessName || !ownerName || !email || !password) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  const db = await getDb();

  const existing = await db.prepare("SELECT id FROM owners WHERE email = ?").bind(email).first();
  if (existing) {
    return NextResponse.json({ error: "An account with this email already exists" }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const businessId = generateId();
  const ownerId = generateId();

  let slug = slugify(businessName);
  const slugExists = await db.prepare("SELECT id FROM businesses WHERE slug = ?").bind(slug).first();
  if (slugExists) slug = `${slug}-${Date.now()}`;

  const trialEndsAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  await db.prepare(`
    INSERT INTO businesses (id, name, slug, industry, email, phone, plan, trial_ends_at)
    VALUES (?, ?, ?, ?, ?, ?, 'trial', ?)
  `).bind(businessId, businessName, slug, industry || "general", email, phone || null, trialEndsAt).run();

  await db.prepare(`
    INSERT INTO owners (id, business_id, email, password_hash, name)
    VALUES (?, ?, ?, ?, ?)
  `).bind(ownerId, businessId, email, passwordHash, ownerName).run();

  const token = await createSession({ ownerId, businessId, email, businessName });
  const res = NextResponse.json({ success: true, redirect: "/onboarding" });
  res.cookies.set(sessionCookieOptions(token));
  return res;
  } catch (err: any) {
    console.error("[register]", err);
    return NextResponse.json({ error: "Registration failed. Please try again." }, { status: 500 });
  }
}
