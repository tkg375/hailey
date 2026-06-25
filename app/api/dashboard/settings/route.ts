import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await requireAuth();
    const db = await getDb();
    const business = await db.prepare(
      "SELECT name, industry, email, phone, address, city, state, timezone, tagline, website_url, website_scraped_at, website_content FROM businesses WHERE id = ?"
    ).bind(session.businessId).first();
    return NextResponse.json({ business });
  } catch (err: any) {
    return NextResponse.json({ error: "Failed to load settings" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await requireAuth();
    const db = await getDb();
    const body = await req.json() as any;
    const { name, tagline, phone, email, address, city, state, timezone, booking_system, booking_fields_required, booking_payment_required, booking_payment_details, booking_webhook_url, booking_webhook_key } = body;
    await db.prepare(`
      UPDATE businesses SET
        name = COALESCE(?, name),
        tagline = ?,
        phone = ?,
        email = COALESCE(?, email),
        address = ?,
        city = ?,
        state = ?,
        timezone = COALESCE(?, timezone),
        booking_system = COALESCE(?, booking_system),
        booking_fields_required = COALESCE(?, booking_fields_required),
        booking_payment_required = COALESCE(?, booking_payment_required),
        booking_payment_details = COALESCE(?, booking_payment_details),
        booking_webhook_url = COALESCE(?, booking_webhook_url),
        booking_webhook_key = COALESCE(?, booking_webhook_key)
      WHERE id = ?
    `).bind(
      name, tagline ?? null, phone ?? null, email, address ?? null, city ?? null, state ?? null, timezone,
      booking_system ?? null, booking_fields_required ?? null,
      booking_payment_required ?? null, booking_payment_details ?? null,
      booking_webhook_url ?? null, booking_webhook_key ?? null,
      session.businessId
    ).run();
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
  }
}
