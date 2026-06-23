import { NextRequest, NextResponse } from "next/server";
import { getDb, generateId } from "@/lib/db";
import { sendEmail, appointmentConfirmationEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ businessId: string }> }) {
  const { businessId } = await params;
  const body = await req.json() as any;
  const { serviceId, serviceName, date, time, durationMinutes, priceCents, clientName, clientEmail, clientPhone, notes } = body;

  if (!clientName || !serviceId || !date || !time) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const db = await getDb();

  const business = await db.prepare("SELECT * FROM businesses WHERE id = ? AND active = 1")
    .bind(businessId).first<any>();
  if (!business) return NextResponse.json({ error: "Business not found" }, { status: 404 });

  // Upsert client
  let clientId: string | null = null;
  if (clientEmail) {
    const existing = await db.prepare("SELECT id FROM clients WHERE business_id = ? AND email = ?")
      .bind(businessId, clientEmail).first<{ id: string }>();
    if (existing) {
      clientId = existing.id;
      await db.prepare("UPDATE clients SET last_visit_at = datetime('now') WHERE id = ?").bind(clientId).run();
    } else {
      clientId = generateId();
      await db.prepare("INSERT INTO clients (id, business_id, name, email, phone) VALUES (?, ?, ?, ?, ?)")
        .bind(clientId, businessId, clientName, clientEmail, clientPhone || null).run();
    }
  }

  const id = generateId();
  await db.prepare(`
    INSERT INTO appointments (id, business_id, client_id, service_id, client_name, client_email, client_phone, service_name, date, time, duration_minutes, price_cents, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(id, businessId, clientId, serviceId, clientName, clientEmail || null, clientPhone || null,
    serviceName, date, time, durationMinutes || 60, priceCents || 0, notes || null).run();

  // Send confirmation email
  if (clientEmail) {
    try {
      const formattedDate = new Date(date + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
      const [h, m] = time.split(":").map(Number);
      const ampm = h >= 12 ? "PM" : "AM";
      const formattedTime = `${h % 12 || 12}:${m.toString().padStart(2, "0")} ${ampm}`;

      await sendEmail({
        to: clientEmail,
        subject: `Appointment confirmed at ${business.name}`,
        html: appointmentConfirmationEmail({
          businessName: business.name,
          clientName,
          serviceName,
          date: formattedDate,
          time: formattedTime,
          businessPhone: business.phone,
        }),
      });
    } catch (e) {
      console.error("Failed to send confirmation email:", e);
    }
  }

  return NextResponse.json({ id });
}
