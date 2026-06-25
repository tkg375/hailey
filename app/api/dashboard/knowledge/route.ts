import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDb, generateId } from "@/lib/db";
import { chunkText, ingestChunks, deleteBusinessChunks } from "@/lib/vectorize";

export const dynamic = "force-dynamic";

// GET /api/dashboard/knowledge — list all chunks for this business
export async function GET() {
  const session = await requireAuth();
  const db = await getDb();

  const rows = await db.prepare(
    "SELECT id, content, source_type, source_label, created_at FROM knowledge_chunks WHERE business_id = ? ORDER BY created_at DESC LIMIT 200"
  ).bind(session.businessId).all();

  return NextResponse.json({ chunks: rows.results });
}

// POST /api/dashboard/knowledge — ingest custom text
export async function POST(req: NextRequest) {
  const session = await requireAuth();

  const { text, sourceLabel } = await req.json() as any;
  if (!text?.trim()) return NextResponse.json({ error: "text required" }, { status: 400 });

  const db = await getDb();
  const ctx = await getCloudflareContext({ async: true });
  const vectorize = (ctx.env as any).VECTORIZE;

  if (!vectorize) return NextResponse.json({ error: "Vectorize not available" }, { status: 500 });

  const rawChunks = chunkText(text.trim(), sourceLabel ?? "Custom");
  const chunks = rawChunks.map(c => ({ ...c, sourceType: "manual" }));
  const count = await ingestChunks(vectorize, db, session.businessId, chunks);

  return NextResponse.json({ success: true, chunksAdded: count });
}

// DELETE /api/dashboard/knowledge?id=<chunkId> — delete one chunk
// DELETE /api/dashboard/knowledge?sourceType=website — delete all chunks of a type
export async function DELETE(req: NextRequest) {
  const session = await requireAuth();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const sourceType = searchParams.get("sourceType");

  const db = await getDb();
  const ctx = await getCloudflareContext({ async: true });
  const vectorize = (ctx.env as any).VECTORIZE;

  if (id) {
    const row = await db.prepare(
      "SELECT vectorize_id FROM knowledge_chunks WHERE id = ? AND business_id = ?"
    ).bind(id, session.businessId).first<{ vectorize_id: string }>();
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (vectorize && row.vectorize_id) await vectorize.deleteByIds([row.vectorize_id]);
    await db.prepare("DELETE FROM knowledge_chunks WHERE id = ?").bind(id).run();
    return NextResponse.json({ success: true });
  }

  if (sourceType) {
    await deleteBusinessChunks(vectorize, db, session.businessId, sourceType);
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Provide id or sourceType" }, { status: 400 });
}
