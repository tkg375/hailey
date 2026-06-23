import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getDb } from "@/lib/db";
import { createSession, sessionCookieOptions } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json() as any;
  if (!email || !password) {
    return NextResponse.json({ error: "Missing email or password" }, { status: 400 });
  }

  const db = await getDb();

  const owner = await db.prepare(`
    SELECT o.*, b.name as business_name FROM owners o
    JOIN businesses b ON b.id = o.business_id
    WHERE o.email = ?
  `).bind(email).first<any>();

  if (!owner) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  const valid = await bcrypt.compare(password, owner.password_hash);
  if (!valid) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  const token = await createSession({
    ownerId: owner.id,
    businessId: owner.business_id,
    email: owner.email,
    businessName: owner.business_name,
  });

  const res = NextResponse.json({ success: true });
  res.cookies.set(sessionCookieOptions(token));
  return res;
}
