import { generateId } from "./db";

const EMBED_MODEL = "@cf/baai/bge-base-en-v1.5"; // 768 dimensions
const CHUNK_SIZE = 1800;
const CHUNK_OVERLAP = 200;
const TOP_K = 6;

export function chunkText(text: string, sourceLabel: string): { content: string; sourceLabel: string }[] {
  const chunks: { content: string; sourceLabel: string }[] = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + CHUNK_SIZE, text.length);
    const chunk = text.slice(start, end).trim();
    if (chunk.length > 80) {
      chunks.push({ content: chunk, sourceLabel });
    }
    if (end >= text.length) break;
    start = end - CHUNK_OVERLAP;
  }
  return chunks;
}

async function embed(ai: any, text: string): Promise<number[]> {
  const res = await ai.run(EMBED_MODEL, { text: [text] });
  return res?.data?.[0] ?? res?.[0] ?? [];
}

export async function ingestChunks(
  ai: any,
  vectorize: any,
  db: D1Database,
  businessId: string,
  chunks: { content: string; sourceType: string; sourceLabel: string }[]
): Promise<number> {
  if (!chunks.length) return 0;

  const vectors: { id: string; values: number[]; metadata: Record<string, string> }[] = [];
  const dbRows: { id: string; content: string; sourceType: string; sourceLabel: string }[] = [];

  for (const chunk of chunks) {
    const values = await embed(ai, chunk.content);
    if (!values.length) continue;
    const id = generateId();
    vectors.push({ id, values, metadata: { businessId, sourceType: chunk.sourceType, sourceLabel: chunk.sourceLabel } });
    dbRows.push({ id, content: chunk.content, sourceType: chunk.sourceType, sourceLabel: chunk.sourceLabel });
  }

  if (!vectors.length) return 0;

  await vectorize.upsert(vectors);

  const stmt = db.prepare(
    "INSERT OR IGNORE INTO knowledge_chunks (id, business_id, content, source_type, source_label, vectorize_id, created_at) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))"
  );
  await Promise.all(dbRows.map(r => stmt.bind(r.id, businessId, r.content, r.sourceType, r.sourceLabel, r.id).run()));

  return dbRows.length;
}

export async function deleteBusinessChunks(
  vectorize: any,
  db: D1Database,
  businessId: string,
  sourceType?: string
): Promise<void> {
  const rows = sourceType
    ? await db.prepare("SELECT vectorize_id FROM knowledge_chunks WHERE business_id = ? AND source_type = ?").bind(businessId, sourceType).all()
    : await db.prepare("SELECT vectorize_id FROM knowledge_chunks WHERE business_id = ?").bind(businessId).all();

  const ids = (rows.results as any[]).map(r => r.vectorize_id).filter(Boolean);
  if (ids.length) await vectorize.deleteByIds(ids);

  if (sourceType) {
    await db.prepare("DELETE FROM knowledge_chunks WHERE business_id = ? AND source_type = ?").bind(businessId, sourceType).run();
  } else {
    await db.prepare("DELETE FROM knowledge_chunks WHERE business_id = ?").bind(businessId).run();
  }
}

export async function retrieveRelevant(
  ai: any,
  vectorize: any,
  db: D1Database,
  businessId: string,
  query: string
): Promise<string> {
  const queryVec = await embed(ai, query);
  if (!queryVec.length) return "";

  const results = await vectorize.query(queryVec, {
    topK: TOP_K,
    filter: { businessId },
    returnMetadata: true,
  });

  const matches = results?.matches ?? [];
  if (!matches.length) return "";

  // Filter to score >= 0.35 to avoid irrelevant noise
  const relevant = matches.filter((m: any) => (m.score ?? 0) >= 0.35);
  if (!relevant.length) return "";

  const ids = relevant.map((m: any) => m.id).filter(Boolean);
  if (!ids.length) return "";

  const placeholders = ids.map(() => "?").join(",");
  const rows = await db.prepare(
    `SELECT content, source_label FROM knowledge_chunks WHERE id IN (${placeholders})`
  ).bind(...ids).all();

  const chunks = (rows.results as any[]).map(r => r.content).join("\n\n---\n\n");
  return chunks;
}
