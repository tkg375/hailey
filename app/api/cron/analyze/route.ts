import { NextRequest, NextResponse } from "next/server";
import { getDb, generateId } from "@/lib/db";
import { chatCompletion } from "@/lib/openai";

export const dynamic = "force-dynamic";

// Called by Cloudflare Cron at 4am UTC daily
// Uses Cloudflare Workers AI to analyze conversation patterns and update FAQs
export async function GET(req: NextRequest) {
  // Verify this is a cron call (Cloudflare sets this header)
  const isCron = req.headers.get("x-cloudflare-cron") !== null;
  const cronSecret = req.headers.get("x-cron-secret");
  if (!isCron && cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = await getDb();

  // Get all businesses with conversations in the last 7 days
  const businesses = await db.prepare(`
    SELECT DISTINCT c.business_id
    FROM conversations c
    WHERE c.updated_at >= datetime('now', '-7 days')
  `).all();

  const results: any[] = [];

  for (const row of businesses.results as any[]) {
    const bizId = row.business_id;

    // Get recent unanswered or common questions from conversations
    const recentMessages = await db.prepare(`
      SELECT cm.content, cm.role
      FROM conversation_messages cm
      JOIN conversations c ON c.id = cm.conversation_id
      WHERE c.business_id = ?
        AND c.updated_at >= datetime('now', '-7 days')
      ORDER BY cm.created_at ASC
      LIMIT 200
    `).bind(bizId).all();

    if (recentMessages.results.length < 4) continue;

    const transcript = (recentMessages.results as any[])
      .map(m => `${m.role === "user" ? "Visitor" : "Hailey"}: ${m.content}`)
      .join("\n");

    // Pull Hailey's own task outcomes (escalations, abandoned bookings, etc.) for the same window
    const taskEvents = await db.prepare(`
      SELECT event_type, detail FROM hailey_task_events
      WHERE business_id = ? AND created_at >= datetime('now', '-7 days')
    `).bind(bizId).all();

    if (taskEvents.results.length >= 3) {
      const eventsSummary = (taskEvents.results as any[])
        .map(e => `${e.event_type}${e.detail ? `: ${e.detail}` : ""}`)
        .join("\n");

      const taskAnalysisPrompt = `You are analyzing an AI receptionist's own task performance for a local business, to help her improve.

Task events from the last 7 days:
${eventsSummary.slice(0, 6000)}

Respond with ONLY valid JSON in this exact format:
{
  "learnings": [
    {"category": "friction_point", "summary": "Clients often abandon booking when asked for payment upfront"},
    {"category": "escalation_pattern", "summary": "Escalates often when clients ask about insurance coverage"}
  ]
}
category must be one of: friction_point, escalation_pattern, success_pattern.
Only include real, specific, actionable patterns — up to 5. If nothing meaningful stands out, return an empty array.`;

      try {
        const taskResponseText: string = await chatCompletion([{ role: "user", content: taskAnalysisPrompt }], 512);
        const taskJsonMatch = taskResponseText.match(/\{[\s\S]*\}/);
        if (taskJsonMatch) {
          const taskParsed = JSON.parse(taskJsonMatch[0]);
          for (const l of taskParsed.learnings || []) {
            if (!l.category || !l.summary) continue;
            await db.prepare(`
              INSERT INTO hailey_learnings (id, business_id, category, summary, occurrences, last_seen_at, updated_at)
              VALUES (?, ?, ?, ?, 1, datetime('now'), datetime('now'))
              ON CONFLICT(business_id, category, summary)
              DO UPDATE SET occurrences = occurrences + 1, last_seen_at = datetime('now'), updated_at = datetime('now')
            `).bind(generateId(), bizId, l.category, l.summary).run();
          }
        }
      } catch {}
    }

    // Use Cloudflare Workers AI (Llama) to extract patterns
    const analysisPrompt = `You are analyzing customer service conversations for a local business. Extract insights from these conversations.

Conversations:
${transcript.slice(0, 8000)}

Respond with ONLY valid JSON in this exact format:
{
  "top_questions": [
    {"question": "What is your price for X?", "suggested_answer": "Our price for X is $Y"},
    {"question": "Are you open on weekends?", "suggested_answer": "Yes, we are open Saturday 9am-5pm"}
  ],
  "insights": [
    {"type": "top_question", "key": "price inquiry", "count": 5},
    {"type": "booking_intent", "key": "weekend appointments", "count": 3}
  ]
}

Include up to 5 top_questions and up to 10 insights. Only include real patterns from the conversations.`;

    try {
      const responseText: string = await chatCompletion([{ role: "user", content: analysisPrompt }], 1024);
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) continue;

      const parsed = JSON.parse(jsonMatch[0]);

      // Upsert top questions as FAQs
      for (const q of parsed.top_questions || []) {
        if (!q.question || !q.suggested_answer) continue;

        const existing = await db.prepare(
          "SELECT id, times_asked FROM business_faqs WHERE business_id = ? AND question = ? LIMIT 1"
        ).bind(bizId, q.question).first() as any;

        if (existing) {
          await db.prepare(
            "UPDATE business_faqs SET times_asked = times_asked + 1, answer = ?, updated_at = datetime('now') WHERE id = ?"
          ).bind(q.suggested_answer, existing.id).run();
        } else {
          await db.prepare(
            "INSERT INTO business_faqs (id, business_id, question, answer, source, confidence, times_asked) VALUES (?, ?, ?, ?, 'learned', 0.7, 1)"
          ).bind(generateId(), bizId, q.question, q.suggested_answer).run();
        }
      }

      // Upsert insights
      for (const ins of parsed.insights || []) {
        if (!ins.type || !ins.key) continue;
        await db.prepare(`
          INSERT INTO business_insights (id, business_id, insight_type, insight_key, insight_value, count, last_seen_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
          ON CONFLICT(business_id, insight_type, insight_key)
          DO UPDATE SET count = count + excluded.count, last_seen_at = datetime('now'), updated_at = datetime('now')
        `).bind(generateId(), bizId, ins.type, ins.key, ins.key, ins.count || 1).run();
      }

      results.push({ businessId: bizId, questionsLearned: (parsed.top_questions || []).length });
    } catch (err: any) {
      results.push({ businessId: bizId, error: err.message });
    }
  }

  return NextResponse.json({ ok: true, processed: businesses.results.length, results });
}
