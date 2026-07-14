import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb, generateId } from "@/lib/db";

const LABELS: Record<string, string> = {
  post_visit: "After every appointment",
  no_show: "When client no-shows",
  reengagement: "When client goes quiet (60+ days)",
};

export async function GET() {
  const session = await requireAuth();
  const db = await getDb();
  const rows = await db.prepare(
    "SELECT trigger, active FROM followup_sequences WHERE business_id = ?"
  ).bind(session.businessId).all();
  return NextResponse.json({ sequences: rows.results });
}

export async function POST(req: NextRequest) {
  const session = await requireAuth();
  const { trigger } = await req.json() as { trigger: string };
  if (!LABELS[trigger]) {
    return NextResponse.json({ error: "Unknown trigger" }, { status: 400 });
  }

  const db = await getDb();
  const existing = await db.prepare(
    "SELECT id, active FROM followup_sequences WHERE business_id = ? AND trigger = ?"
  ).bind(session.businessId, trigger).first<{ id: string; active: number }>();

  if (existing) {
    await db.prepare("UPDATE followup_sequences SET active = ? WHERE id = ?")
      .bind(existing.active ? 0 : 1, existing.id).run();
    return NextResponse.json({ active: existing.active ? 0 : 1 });
  }

  await db.prepare(
    "INSERT INTO followup_sequences (id, business_id, name, trigger, active, created_at) VALUES (?, ?, ?, ?, 1, datetime('now'))"
  ).bind(generateId(), session.businessId, LABELS[trigger], trigger).run();
  return NextResponse.json({ active: 1 });
}
