import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb, generateId } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await requireAuth();
  const db = await getDb();
  const hours = await db.prepare(
    "SELECT day_of_week, open_time, close_time, is_closed FROM business_hours WHERE business_id = ? ORDER BY day_of_week"
  ).bind(session.businessId).all();
  return NextResponse.json({ hours: hours.results });
}

export async function POST(req: NextRequest) {
  const session = await requireAuth();
  const db = await getDb();
  const { schedule } = await req.json() as { schedule: Array<{ day_of_week: number; open_time: string; close_time: string; is_closed: boolean }> };

  for (const day of schedule) {
    const existing = await db.prepare(
      "SELECT id FROM business_hours WHERE business_id = ? AND day_of_week = ?"
    ).bind(session.businessId, day.day_of_week).first<{ id: string }>();

    if (existing) {
      await db.prepare(
        "UPDATE business_hours SET open_time = ?, close_time = ?, is_closed = ? WHERE business_id = ? AND day_of_week = ?"
      ).bind(day.open_time, day.close_time, day.is_closed ? 1 : 0, session.businessId, day.day_of_week).run();
    } else {
      await db.prepare(
        "INSERT INTO business_hours (id, business_id, day_of_week, open_time, close_time, is_closed) VALUES (?, ?, ?, ?, ?, ?)"
      ).bind(generateId(), session.businessId, day.day_of_week, day.open_time, day.close_time, day.is_closed ? 1 : 0).run();
    }
  }
  return NextResponse.json({ success: true });
}
