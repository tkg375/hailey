import { NextRequest, NextResponse } from "next/server";
import { getDb, generateId } from "@/lib/db";

export const dynamic = "force-dynamic";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function POST(req: NextRequest) {
  try {
    const { businessId, name, email, phone, service, date, time, notes } = await req.json() as any;

    if (!businessId || !name || !date || !time) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400, headers: CORS });
    }

    const db = await getDb();

    // Check slot still open
    const taken = await db.prepare(
      "SELECT id FROM appointments WHERE business_id = ? AND date = ? AND time = ? AND status = 'confirmed'"
    ).bind(businessId, date, time).first();
    if (taken) {
      return NextResponse.json({ error: "That time slot was just taken. Please pick another." }, { status: 409, headers: CORS });
    }

    // Upsert client
    let clientId: string | null = null;
    if (email) {
      const existing = await db.prepare(
        "SELECT id FROM clients WHERE business_id = ? AND email = ?"
      ).bind(businessId, email).first<{ id: string }>();
      if (existing) {
        clientId = existing.id;
        await db.prepare("UPDATE clients SET name = ?, phone = COALESCE(?, phone) WHERE id = ?")
          .bind(name, phone ?? null, clientId).run();
      } else {
        clientId = generateId();
        await db.prepare("INSERT INTO clients (id, business_id, name, email, phone, created_at) VALUES (?, ?, ?, ?, ?, datetime('now'))")
          .bind(clientId, businessId, name, email, phone ?? null).run();
      }
    }

    const apptId = generateId();
    await db.prepare(`
      INSERT INTO appointments (id, business_id, client_id, client_name, client_email, client_phone, service_name, date, time, status, notes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed', ?, datetime('now'))
    `).bind(apptId, businessId, clientId, name, email ?? null, phone ?? null, service ?? "Consultation", date, time, notes ?? null).run();

    return NextResponse.json({ success: true, appointmentId: apptId }, { headers: CORS });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Booking failed" }, { status: 500, headers: CORS });
  }
}
