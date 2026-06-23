import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const db = await getDb();
    const body = await req.json() as any;
    await db.prepare("UPDATE services SET active = ? WHERE id = ? AND business_id = ?")
      .bind(body.active, id, session.businessId).run();
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: "Failed to update service" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const db = await getDb();
    await db.prepare("DELETE FROM services WHERE id = ? AND business_id = ?")
      .bind(id, session.businessId).run();
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: "Failed to delete service" }, { status: 500 });
  }
}
