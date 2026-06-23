import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

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
    const { businessId, pendingBooking, agreedKeys, agreedAt } = await req.json() as any;

    if (!businessId || !pendingBooking) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400, headers: CORS });
    }

    const db = await getDb();

    const business = await db.prepare(
      "SELECT booking_webhook_url, booking_webhook_key, booking_agreements FROM businesses WHERE id = ? AND active = 1"
    ).bind(businessId).first() as any;

    if (!business) {
      return NextResponse.json({ error: "Business not found" }, { status: 404, headers: CORS });
    }

    // Validate all agreements were accepted
    if (business.booking_agreements) {
      const required: string[] = (JSON.parse(business.booking_agreements) as any[]).map(a => a.key);
      const accepted = new Set(agreedKeys ?? []);
      if (!required.every(k => accepted.has(k))) {
        return NextResponse.json({ error: "All agreements must be accepted" }, { status: 400, headers: CORS });
      }
    }

    const { date, time, name, email, petName, petType, service } = pendingBooking;

    if (!date || !time || !name || !email) {
      return NextResponse.json({ error: "Incomplete booking data" }, { status: 400, headers: CORS });
    }

    if (business.booking_webhook_url && business.booking_webhook_key) {
      const webhookRes = await fetch(business.booking_webhook_url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-hailey-api-key": business.booking_webhook_key,
        },
        body: JSON.stringify({
          name, email, petName, petType,
          concern: service,
          date, time,
          agreedKeys,
          agreedAt,
        }),
      });

      if (!webhookRes.ok) {
        const body = await webhookRes.text().catch(() => "");
        console.error("[confirm-booking webhook]", webhookRes.status, body);
        return NextResponse.json({ error: "Booking failed. Please try again." }, { status: 502, headers: CORS });
      }

      await db.prepare(
        "UPDATE conversations SET status = 'booked' WHERE business_id = ? AND visitor_email = ? AND status = 'open' ORDER BY created_at DESC LIMIT 1"
      ).bind(businessId, email).run();

      return NextResponse.json({ success: true, bookingConfirmed: { date, time, name, email, service, petName, petType, isGuest: true } }, { headers: CORS });
    }

    return NextResponse.json({ error: "No booking method configured" }, { status: 500, headers: CORS });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Unknown error" }, { status: 500, headers: CORS });
  }
}
