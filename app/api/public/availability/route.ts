import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

function generateSlots(open: string, close: string): string[] {
  const slots: string[] = [];
  const [sh, sm] = open.split(":").map(Number);
  const [eh, em] = close.split(":").map(Number);
  for (let m = sh * 60 + sm; m < eh * 60 + em; m += 30) {
    slots.push(`${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`);
  }
  return slots;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const businessId = searchParams.get("businessId");
  const date = searchParams.get("date");

  if (!businessId || !date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ slots: [] }, { headers: CORS });
  }

  const db = await getDb();
  const dayOfWeek = new Date(date + "T00:00:00").getDay();

  const dayRow = await db.prepare(
    "SELECT open_time, close_time, is_closed FROM business_hours WHERE business_id = ? AND day_of_week = ?"
  ).bind(businessId, dayOfWeek).first<any>();

  if (!dayRow || dayRow.is_closed || !dayRow.open_time) {
    return NextResponse.json({ slots: [] }, { headers: CORS });
  }

  const allSlots = generateSlots(dayRow.open_time, dayRow.close_time);

  const booked = await db.prepare(
    "SELECT time FROM appointments WHERE business_id = ? AND date = ? AND status = 'confirmed'"
  ).bind(businessId, date).all<{ time: string }>();

  const bookedSet = new Set(booked.results.map(r => r.time));
  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];

  const available = allSlots.filter(slot => {
    if (bookedSet.has(slot)) return false;
    if (date < todayStr) return false;
    if (date === todayStr) {
      const [h, m] = slot.split(":").map(Number);
      const slotTime = new Date();
      slotTime.setHours(h, m, 0, 0);
      return slotTime.getTime() - now.getTime() > 30 * 60 * 1000;
    }
    return true;
  });

  return NextResponse.json({ slots: available }, { headers: CORS });
}
