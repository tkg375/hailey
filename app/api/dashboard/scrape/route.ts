import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDb } from "@/lib/db";
import { chunkText, ingestChunks, deleteBusinessChunks } from "@/lib/vectorize";
import { chatCompletion } from "@/lib/openai";

export const dynamic = "force-dynamic";

const MAX_PAGES = 60;
const FETCH_TIMEOUT_MS = 8000;
const CONCURRENCY = 8;

// Pages that are never useful for a receptionist's knowledge base
const SKIP_PATTERNS = [
  /\/(wp-admin|wp-login|wp-json|wp-content\/uploads)/i,
  /\/(cart|checkout|my-account|order|login|register|logout|sitemap)/i,
  /\/(cdn-cgi|\.well-known|robots\.txt|ads\.txt)/i,
  /\.(pdf|jpg|jpeg|png|gif|webp|svg|ico|css|js|xml|json|zip|mp4|mp3)(\?|$)/i,
  /#/,
];

function shouldSkip(url: string): boolean {
  return SKIP_PATTERNS.some(p => p.test(url));
}

function normalizeUrl(href: string, base: string): string | null {
  try {
    const u = new URL(href, base);
    // Same origin only
    const b = new URL(base);
    if (u.hostname !== b.hostname) return null;
    // Drop query strings and fragments for deduplication
    u.search = "";
    u.hash = "";
    return u.href.replace(/\/$/, "");
  } catch {
    return null;
  }
}

function extractText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, "")
    .replace(/<header[\s\S]*?<\/header>/gi, " ")
    .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
    .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractLinks(html: string, pageUrl: string, base: string): string[] {
  const links: string[] = [];
  const re = /href=["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const normalized = normalizeUrl(m[1], pageUrl);
    if (normalized && !shouldSkip(normalized)) links.push(normalized);
  }
  return links;
}

async function fetchPage(url: string): Promise<{ text: string; html: string } | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; HaileyBot/1.0; +https://tryhailey.com)" },
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") ?? "";
    if (!ct.includes("html")) return null;
    const html = await res.text();
    return { text: extractText(html), html };
  } catch {
    return null;
  }
}

async function parseSitemap(sitemapUrl: string, base: string): Promise<string[]> {
  try {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 6000);
    const res = await fetch(sitemapUrl, { signal: controller.signal });
    if (!res.ok) return [];
    const xml = await res.text();

    // Sitemap index — recurse into child sitemaps (limit to first 3)
    if (xml.includes("<sitemapindex")) {
      const childUrls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)]
        .map(m => m[1].trim())
        .filter(u => u.includes("sitemap"))
        .slice(0, 3);
      const nested = await Promise.all(childUrls.map(u => parseSitemap(u, base)));
      return nested.flat();
    }

    // Regular sitemap
    return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)]
      .map(m => m[1].trim())
      .filter(u => {
        const norm = normalizeUrl(u, base);
        return norm && !shouldSkip(norm);
      })
      .map(u => normalizeUrl(u, base)!)
      .filter(Boolean);
  } catch {
    return [];
  }
}

// Exhaustive list of common paths to brute-force when JS-rendered sites block link discovery
const COMMON_PATHS = [
  "", "/about", "/about-us", "/our-story", "/who-we-are", "/team", "/our-team", "/staff", "/meet-the-team",
  "/services", "/service", "/our-services", "/what-we-do", "/offerings", "/specialties",
  "/pricing", "/prices", "/rates", "/packages", "/plans",
  "/faq", "/faqs", "/frequently-asked-questions", "/questions", "/help",
  "/contact", "/contact-us", "/get-in-touch", "/reach-us", "/location", "/locations", "/find-us",
  "/book", "/booking", "/book-now", "/book-appointment", "/schedule", "/appointments", "/reserve",
  "/shop", "/store", "/products", "/menu", "/catalog",
  "/blog", "/news", "/articles", "/posts", "/updates", "/resources",
  "/testimonials", "/reviews", "/success-stories", "/case-studies",
  "/gallery", "/portfolio", "/work", "/projects",
  "/careers", "/jobs", "/join-us",
  "/privacy", "/privacy-policy", "/terms", "/terms-of-service", "/refund-policy", "/cancellation-policy",
  "/new-clients", "/new-patients", "/first-visit", "/getting-started",
  "/telemedicine", "/telehealth", "/virtual-visit", "/online-appointments",
  "/emergency", "/urgent-care", "/after-hours",
  "/specials", "/promotions", "/deals", "/offers",
  "/insurance", "/payment", "/financing",
  "/grooming", "/boarding", "/daycare", "/training", "/wellness", "/surgery", "/dental",
  "/farm", "/livestock", "/equine", "/exotic", "/small-animal", "/large-animal",
  "/spa", "/salon", "/massage", "/facials", "/waxing", "/nails",
  "/auto", "/detailing", "/repairs",
];

async function bruteForceProbe(base: string, existing: Set<string>): Promise<{ url: string; text: string }[]> {
  const toTry = COMMON_PATHS
    .map(p => base + p)
    .filter(u => !existing.has(u));

  const results: { url: string; text: string }[] = [];
  for (let i = 0; i < toTry.length; i += CONCURRENCY) {
    const batch = toTry.slice(i, i + CONCURRENCY);
    const fetched = await Promise.allSettled(
      batch.map(url => fetchPage(url).then(r => ({ url, result: r })))
    );
    for (const f of fetched) {
      if (f.status !== "fulfilled" || !f.value.result) continue;
      const { url, result } = f.value;
      if (result.text.length > 150) results.push({ url, text: result.text });
    }
    if (results.length + existing.size >= MAX_PAGES) break;
  }
  return results;
}

// Crawl in batches with concurrency control
async function crawlSite(base: string): Promise<{ url: string; text: string }[]> {
  const visited = new Set<string>();
  const queue: string[] = [];
  const results: { url: string; text: string }[] = [];

  const baseNorm = base.replace(/\/$/, "");

  // Priority seed: common high-value pages
  const seeds = [
    baseNorm,
    `${baseNorm}/services`, `${baseNorm}/service`,
    `${baseNorm}/pricing`, `${baseNorm}/prices`,
    `${baseNorm}/about`, `${baseNorm}/about-us`,
    `${baseNorm}/faq`, `${baseNorm}/faqs`,
    `${baseNorm}/contact`, `${baseNorm}/contact-us`,
    `${baseNorm}/menu`, `${baseNorm}/shop`,
    `${baseNorm}/products`, `${baseNorm}/team`,
    `${baseNorm}/locations`, `${baseNorm}/location`,
  ];

  // Try sitemap first
  const sitemapUrls = await parseSitemap(`${baseNorm}/sitemap.xml`, baseNorm)
    .catch(() => [] as string[]);
  const sitemapIndex = await parseSitemap(`${baseNorm}/sitemap_index.xml`, baseNorm)
    .catch(() => [] as string[]);

  const allSitemapUrls = [...new Set([...sitemapUrls, ...sitemapIndex])];

  // Sitemap found: prioritize those URLs, then seeds as fallback
  if (allSitemapUrls.length > 0) {
    queue.push(...allSitemapUrls.slice(0, MAX_PAGES));
    for (const s of seeds) {
      if (!queue.includes(s)) queue.unshift(s);
    }
  } else {
    // No sitemap: start with seeds and discover via links
    queue.push(...seeds);
  }

  // BFS crawler
  while (queue.length > 0 && results.length < MAX_PAGES) {
    const batch = queue.splice(0, CONCURRENCY).filter(u => !visited.has(u));
    if (!batch.length) continue;
    for (const u of batch) visited.add(u);

    const fetched = await Promise.allSettled(batch.map(url => fetchPage(url).then(r => ({ url, result: r }))));

    for (const f of fetched) {
      if (f.status !== "fulfilled" || !f.value.result) continue;
      const { url, result } = f.value;
      if (!result.text || result.text.length < 100) continue;

      results.push({ url, text: result.text });

      // Discover new links if we still have capacity and no sitemap guided us
      if (allSitemapUrls.length === 0 && results.length < MAX_PAGES) {
        const links = extractLinks(result.html, url, baseNorm);
        for (const link of links) {
          if (!visited.has(link) && !queue.includes(link)) {
            queue.push(link);
          }
        }
      }
    }
  }

  // If link-discovery got very few pages (JS-rendered site), brute-force probe common paths
  if (results.length < 10) {
    const visitedUrls = new Set(results.map(r => r.url));
    for (const v of visited) visitedUrls.add(v);
    const probed = await bruteForceProbe(baseNorm, visitedUrls);
    for (const p of probed) {
      if (!visitedUrls.has(p.url)) results.push(p);
    }
  }

  return results;
}

function parseJson(text: string): any {
  const stripped = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
  const match = stripped.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try { return JSON.parse(match[0]); } catch { return null; }
}

export async function POST(req: NextRequest) {
  const session = await requireAuth();

  try {
    const { websiteUrl } = await req.json() as any;
    if (!websiteUrl) {
      return NextResponse.json({ error: "Website URL required" }, { status: 400 });
    }

    const base = websiteUrl.replace(/\/$/, "");

    // Deep crawl
    const pages = await crawlSite(base);

    if (pages.length === 0) {
      return NextResponse.json({ error: "Could not reach that website. Check the URL and try again." }, { status: 400 });
    }

    // Use first 6 content-rich pages for structured extraction (homepage + high-value pages)
    const extractionPages = pages
      .filter(p => p.text.length > 200)
      .slice(0, 6)
      .map(p => p.text.slice(0, 4000))
      .join("\n\n---\n\n");

    const prompt = `Extract business knowledge from this website content to train an AI receptionist.

Return ONLY a JSON object, no markdown, no explanation, no extra text:
{
  "description": "1-2 sentence summary of what this business does",
  "services": [{ "name": "string", "description": "string", "price": "string" }],
  "hours": "plain text hours or null",
  "location": "city/state or address or null",
  "phone": "phone number or null",
  "policies": ["policy string"],
  "faqs": [{ "question": "string", "answer": "string" }]
}

Rules: only include info clearly present on the site. Max 15 services, 15 FAQs. Omit price field if not listed. Return valid JSON only.

Website content:
${extractionPages}`;

    const rawText: string = await chatCompletion([
      { role: "system", content: "You are a data extraction assistant. Always respond with valid JSON only, no explanation." },
      { role: "user", content: prompt },
    ], 2048);

    if (!rawText) {
      return NextResponse.json({ error: "AI returned empty text." }, { status: 500 });
    }

    const extracted = parseJson(rawText);

    if (!extracted) {
      return NextResponse.json({ error: `JSON parse failed. Raw text: ${rawText.slice(0, 400)}` }, { status: 500 });
    }

    const db = await getDb();
    await db.prepare(
      "UPDATE businesses SET website_url = ?, website_content = ?, website_scraped_at = datetime('now') WHERE id = ?"
    ).bind(websiteUrl, JSON.stringify(extracted), session.businessId).run();

    // Re-ingest ALL crawled pages into Vectorize
    const ctx = await getCloudflareContext({ async: true });
    const vectorize = (ctx.env as any).VECTORIZE;
    if (vectorize) {
      await deleteBusinessChunks(vectorize, db, session.businessId, "website").catch(() => {});

      const allChunks: { content: string; sourceType: string; sourceLabel: string }[] = [];

      // Every crawled page — full text, chunked
      for (const page of pages) {
        const pageChunks = chunkText(page.text, page.url);
        allChunks.push(...pageChunks.map(c => ({ ...c, sourceType: "website" })));
      }

      // Structured data as high-signal dedicated chunks
      if (extracted.description) {
        allChunks.push({ content: `About this business: ${extracted.description}`, sourceType: "website", sourceLabel: "description" });
      }
      if (extracted.services?.length) {
        for (const s of extracted.services) {
          const text = `Service: ${s.name}${s.price ? ` — Price: ${s.price}` : ""}${s.description ? `. ${s.description}` : ""}`;
          allChunks.push({ content: text, sourceType: "website", sourceLabel: "service" });
        }
      }
      if (extracted.faqs?.length) {
        for (const f of extracted.faqs) {
          allChunks.push({ content: `Q: ${f.question}\nA: ${f.answer}`, sourceType: "website", sourceLabel: "faq" });
        }
      }
      if (extracted.policies?.length) {
        allChunks.push({ content: `Policies:\n${extracted.policies.join("\n")}`, sourceType: "website", sourceLabel: "policies" });
      }
      if (extracted.hours) {
        allChunks.push({ content: `Hours of operation: ${extracted.hours}`, sourceType: "website", sourceLabel: "hours" });
      }

      await ingestChunks(vectorize, db, session.businessId, allChunks).catch(() => {});
    }

    // Generate Hailey's self-awareness profile from all scraped content
    const fullContent = pages.map(p => p.text.slice(0, 2000)).join("\n\n---\n\n").slice(0, 20000);
    const profilePrompt = `You are setting up an AI receptionist named Hailey for a business. Based on the website content below, answer each question as specifically as possible. Only use information clearly present on the site — do not guess or invent.

Return ONLY a JSON object, no markdown, no explanation:
{
  "what_we_do": "1-2 sentences: what this business does and who it serves",
  "what_we_book": "What specifically gets booked or scheduled (service names, appointment types, etc.)",
  "processes_to_own": "Step-by-step processes Hailey should handle end-to-end (booking, intake, cancellations, rescheduling, etc.)",
  "booking_policies": "Any rules around booking — deposit required, ID needed, age restrictions, pet requirements, etc.",
  "payment_at_booking": {
    "required": true or false,
    "details": "Exactly what payment is required, when, and how much (deposit, full payment, card on file, etc.) or null if not mentioned",
    "block_booking_without_payment": true or false
  },
  "who_we_are": "Brand voice, tone, and personality this business projects — formal, casual, warm, clinical, etc.",
  "cancellation_policy": "Exact cancellation/reschedule policy including any fees or notice period required, or null if not mentioned",
  "capabilities": "What Hailey can and cannot do for this business specifically",
  "booking_info_required": "Exact information Hailey must collect before confirming a booking (name, email, pet name, insurance, etc.)",
  "never_do": "Things Hailey must never say, promise, or do for this business",
  "emergency_handling": "How to handle urgent or emergency situations — who to refer to, what to say, emergency contacts if listed",
  "objection_handling": "Common hesitations clients may have and how to address them based on this business",
  "differentiators": "What makes this business stand out from competitors, based on how they describe themselves",
  "intake_requirements": "Any forms, waivers, agreements, or pre-visit requirements clients need to complete",
  "communication_style": "Preferred tone: formal or casual, first name or title, emoji or plain text, response length style"
}

Website content:
${fullContent}`;

    const profileRaw = await chatCompletion([
      { role: "system", content: "You are a business analyst setting up an AI receptionist. Always respond with valid JSON only." },
      { role: "user", content: profilePrompt },
    ], 2000).catch(() => "");
    const haileyProfile = profileRaw ? parseJson(profileRaw) : null;

    if (haileyProfile) {
      await db.prepare(
        "UPDATE businesses SET hailey_profile = ? WHERE id = ?"
      ).bind(JSON.stringify(haileyProfile), session.businessId).run();
    }

    return NextResponse.json({
      success: true,
      knowledge: extracted,
      pagesScraped: pages.length,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Scrape failed" }, { status: 500 });
  }
}
