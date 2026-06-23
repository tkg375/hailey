import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getDb, generateId } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = await getDb();
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");

  let query = `SELECT a.*, s.name as service_label FROM appointments a
    LEFT JOIN services s ON s.id = a.service_id
    WHERE a.business_id = ?`;
  const params: any[] = [session.businessId];

  if (date) {
    query += " AND a.date = ?";
    params.push(date);
  }
  query += " ORDER BY a.date DESC, a.time ASC LIMIT 100";

  const result = await db.prepare(query).bind(...params).all();
  return NextResponse.json(result.results);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as any;
  const { clientName, clientEmail, clientPhone, serviceId, serviceName, date, time, durationMinutes, priceCents, notes } = body;

  if (!clientName || !serviceId || !date || !time) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const db = await getDb();
  const id = generateId();

  // Upsert client
  let clientId: string | null = null;
  if (clientEmail) {
    const existing = await db.prepare("SELECT id FROM clients WHERE business_id = ? AND email = ?")
      .bind(session.businessId, clientEmail).first<{ id: string }>();
    if (existing) {
      clientId = existing.id;
      await db.prepare("UPDATE clients SET last_visit_at = datetime('now') WHERE id = ?").bind(clientId).run();
    } else {
      clientId = generateId();
      await db.prepare("INSERT INTO clients (id, business_id, name, email, phone) VALUES (?, ?, ?, ?, ?)")
        .bind(clientId, session.businessId, clientName, clientEmail, clientPhone || null).run();
    }
  }

  await db.prepare(`
    INSERT INTO appointments (id, business_id, client_id, service_id, client_name, client_email, client_phone, service_name, date, time, duration_minutes, price_cents, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(id, session.businessId, clientId, serviceId, clientName, clientEmail || null, clientPhone || null,
    serviceName, date, time, durationMinutes || 60, priceCents || 0, notes || null).run();

  return NextResponse.json({ id });
}
