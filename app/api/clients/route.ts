import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getDb, generateId } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = await getDb();
  const result = await db.prepare("SELECT * FROM clients WHERE business_id = ? ORDER BY name ASC")
    .bind(session.businessId).all();
  return NextResponse.json(result.results);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, email, phone, notes } = await req.json() as any;
  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const db = await getDb();
  const id = generateId();
  await db.prepare("INSERT INTO clients (id, business_id, name, email, phone, notes) VALUES (?, ?, ?, ?, ?, ?)")
    .bind(id, session.businessId, name, email || null, phone || null, notes || null).run();

  return NextResponse.json({ id });
}
