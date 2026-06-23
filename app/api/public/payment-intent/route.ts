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
    const { businessId, name, email } = await req.json() as any;
    if (!businessId) return NextResponse.json({ error: "businessId required" }, { status: 400, headers: CORS });

    const db = await getDb();
    const business = await db.prepare(
      "SELECT booking_webhook_url, booking_webhook_key FROM businesses WHERE id = ? AND active = 1"
    ).bind(businessId).first() as any;

    if (!business?.booking_webhook_url) {
      return NextResponse.json({ error: "Payment not configured for this business" }, { status: 400, headers: CORS });
    }

    const paymentUrl = business.booking_webhook_url.replace(/\/guest$/, "/payment-intent");
    const res = await fetch(paymentUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-hailey-api-key": business.booking_webhook_key ?? "",
      },
      body: JSON.stringify({ name, email }),
    });

    if (!res.ok) {
      const err = await res.text().catch(() => "");
      console.error("[payment-intent proxy]", res.status, err);
      return NextResponse.json({ error: "Failed to create payment intent" }, { status: 500, headers: CORS });
    }

    const data = await res.json();
    return NextResponse.json(data, { headers: CORS });
  } catch (err: any) {
    console.error("[payment-intent proxy]", err);
    return NextResponse.json({ error: err?.message ?? "Unknown error" }, { status: 500, headers: CORS });
  }
}
