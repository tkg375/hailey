import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getDb, generateId } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = await getDb();
  const result = await db.prepare("SELECT * FROM services WHERE business_id = ? AND active = 1 ORDER BY name ASC")
    .bind(session.businessId).all();
  return NextResponse.json(result.results);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, description, durationMinutes, priceCents } = await req.json() as any;
  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const db = await getDb();
  const id = generateId();
  await db.prepare("INSERT INTO services (id, business_id, name, description, duration_minutes, price_cents) VALUES (?, ?, ?, ?, ?, ?)")
    .bind(id, session.businessId, name, description || null, durationMinutes || 60, priceCents || 0).run();

  return NextResponse.json({ id });
}
