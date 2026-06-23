import { getCloudflareContext } from "@opennextjs/cloudflare";

export async function getDb(): Promise<D1Database> {
  const ctx = await getCloudflareContext({ async: true });
  return (ctx.env as any).DB;
}

export function generateId(): string {
  return crypto.randomUUID();
}
