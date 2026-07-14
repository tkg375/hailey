import { NextRequest, NextResponse } from "next/server";
import { getDb, generateId } from "@/lib/db";
import { sendEmail, postVisitEmail, noShowEmail, reengagementEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

// Called daily by Cloudflare Cron. Sends the post_visit / no_show / reengagement
// follow-ups advertised on the dashboard, which previously had no execution behind them.
export async function GET(req: NextRequest) {
  const isCron = req.headers.get("x-cloudflare-cron") !== null;
  const cronSecret = req.headers.get("x-cron-secret");
  if (!isCron && cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = await getDb();
  const sent = { postVisit: 0, noShow: 0, reengagement: 0 };

  // Sequences are per-business opt-in; a missing/inactive row means that trigger stays off.
  const activeSequences = await db.prepare(
    "SELECT business_id, trigger FROM followup_sequences WHERE active = 1"
  ).all<{ business_id: string; trigger: string }>();

  const activeByBiz = new Map<string, Set<string>>();
  for (const row of activeSequences.results) {
    if (!activeByBiz.has(row.business_id)) activeByBiz.set(row.business_id, new Set());
    activeByBiz.get(row.business_id)!.add(row.trigger);
  }

  for (const [businessId, triggers] of activeByBiz) {
    const business = await db.prepare("SELECT name FROM businesses WHERE id = ? AND active = 1")
      .bind(businessId).first<{ name: string }>();
    if (!business) continue;

    // Post-visit: appointments completed 2+ hours ago, not yet thanked
    if (triggers.has("post_visit")) {
      const completed = await db.prepare(`
        SELECT a.id, a.client_email, a.client_name, a.service_name
        FROM appointments a
        WHERE a.business_id = ? AND a.status IN ('confirmed', 'completed')
          AND (a.date || ' ' || a.time) <= datetime('now', '-2 hours')
          AND (a.date || ' ' || a.time) >= datetime('now', '-9 days')
          AND a.client_email IS NOT NULL
          AND NOT EXISTS (SELECT 1 FROM messages m WHERE m.appointment_id = a.id AND m.subject LIKE 'Thanks for visiting%')
        LIMIT 50
      `).bind(businessId).all<any>();

      for (const appt of completed.results) {
        const subject = `Thanks for visiting ${business.name}!`;
        try {
          await sendEmail({ to: appt.client_email, subject, html: postVisitEmail({ businessName: business.name, clientName: appt.client_name, serviceName: appt.service_name }) });
          await db.prepare(
            "INSERT INTO messages (id, business_id, appointment_id, channel, to_address, subject, body, status, sent_at) VALUES (?, ?, ?, 'email', ?, ?, 'post_visit', 'sent', datetime('now'))"
          ).bind(generateId(), businessId, appt.id, appt.client_email, subject).run();
          sent.postVisit++;
        } catch {}
      }
    }

    // No-show: appointments marked no_show, not yet followed up
    if (triggers.has("no_show")) {
      const noShows = await db.prepare(`
        SELECT a.id, a.client_email, a.client_name, a.service_name
        FROM appointments a
        WHERE a.business_id = ? AND a.status = 'no_show'
          AND a.client_email IS NOT NULL
          AND NOT EXISTS (SELECT 1 FROM messages m WHERE m.appointment_id = a.id AND m.subject = 'We missed you!')
        LIMIT 50
      `).bind(businessId).all<any>();

      for (const appt of noShows.results) {
        try {
          await sendEmail({ to: appt.client_email, subject: "We missed you!", html: noShowEmail({ businessName: business.name, clientName: appt.client_name, serviceName: appt.service_name }) });
          await db.prepare(
            "INSERT INTO messages (id, business_id, appointment_id, channel, to_address, subject, body, status, sent_at) VALUES (?, ?, ?, 'email', ?, 'We missed you!', 'no_show', 'sent', datetime('now'))"
          ).bind(generateId(), businessId, appt.id, appt.client_email).run();
          sent.noShow++;
        } catch {}
      }
    }

    // Reengagement: clients quiet for 60+ days, not messaged in the last 60 days
    if (triggers.has("reengagement")) {
      const dormant = await db.prepare(`
        SELECT c.id, c.email, c.name
        FROM clients c
        WHERE c.business_id = ? AND c.email IS NOT NULL
          AND c.last_visit_at IS NOT NULL AND c.last_visit_at <= datetime('now', '-60 days')
          AND NOT EXISTS (
            SELECT 1 FROM messages m
            WHERE m.client_id = c.id AND m.subject LIKE 'We miss you%' AND m.sent_at >= datetime('now', '-60 days')
          )
        LIMIT 50
      `).bind(businessId).all<any>();

      for (const client of dormant.results) {
        const subject = `We miss you at ${business.name}!`;
        try {
          await sendEmail({ to: client.email, subject, html: reengagementEmail({ businessName: business.name, clientName: client.name }) });
          await db.prepare(
            "INSERT INTO messages (id, business_id, client_id, channel, to_address, subject, body, status, sent_at) VALUES (?, ?, ?, 'email', ?, ?, 'reengagement', 'sent', datetime('now'))"
          ).bind(generateId(), businessId, client.id, client.email, subject).run();
          sent.reengagement++;
        } catch {}
      }
    }
  }

  return NextResponse.json({ ok: true, businessesProcessed: activeByBiz.size, sent });
}
