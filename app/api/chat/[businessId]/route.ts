import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDb, generateId } from "@/lib/db";
import { sendEmail, appointmentConfirmationEmail } from "@/lib/email";
import { retrieveRelevant } from "@/lib/vectorize";
import { chatCompletion } from "@/lib/openai";

export const dynamic = "force-dynamic";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ businessId: string }> }
) {
  try {
    const { businessId } = await params;
    const { message, conversationId } = await req.json() as any;

    if (!message?.trim()) {
      return NextResponse.json({ error: "Message required" }, { status: 400, headers: CORS });
    }

    const db = await getDb();

    const business = await db.prepare(
      "SELECT id, name, industry, phone, address, city, state, timezone, website_content, hailey_profile, availability_url, booking_url, booking_webhook_url, booking_webhook_key, booking_agreements, booking_system, booking_fields_required, booking_payment_required, booking_payment_details, sms_consent_required, sms_consent_text FROM businesses WHERE id = ? AND active = 1"
    ).bind(businessId).first() as any;

    if (!business) {
      return NextResponse.json({ error: "Business not found" }, { status: 404, headers: CORS });
    }

    const [services, hours, faqs] = await Promise.all([
      db.prepare("SELECT name, description, duration_minutes, price_cents FROM services WHERE business_id = ? AND active = 1")
        .bind(businessId).all(),
      db.prepare("SELECT day_of_week, open_time, close_time, is_closed FROM business_hours WHERE business_id = ? ORDER BY day_of_week")
        .bind(businessId).all(),
      db.prepare("SELECT question, answer FROM business_faqs WHERE business_id = ? AND active = 1 ORDER BY times_asked DESC LIMIT 20")
        .bind(businessId).all(),
    ]);

    // Get or create conversation
    let convId = conversationId;
    if (!convId) {
      convId = generateId();
      await db.prepare(
        "INSERT INTO conversations (id, business_id, channel, status, created_at, updated_at) VALUES (?, ?, 'web', 'open', datetime('now'), datetime('now'))"
      ).bind(convId, businessId).run();
    }

    const history = await db.prepare(
      "SELECT role, content FROM conversation_messages WHERE conversation_id = ? ORDER BY created_at ASC LIMIT 30"
    ).bind(convId).all();

    // Build context
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const hoursText = hours.results.length > 0
      ? hours.results.map((h: any) => h.is_closed ? `${dayNames[h.day_of_week]}: Closed` : `${dayNames[h.day_of_week]}: ${h.open_time} – ${h.close_time}`).join("\n")
      : "Hours not specified — ask the visitor to call for availability.";

    const servicesText = services.results.length > 0
      ? services.results.map((s: any) => `- ${s.name}: ${s.description || ""}  |  ${s.duration_minutes} min  |  ${s.price_cents === 0 ? "Free" : "$" + (s.price_cents / 100).toFixed(0)}`).join("\n")
      : "Services not listed — tell the visitor to call for pricing.";

    const faqsText = faqs.results.length > 0
      ? faqs.results.map((f: any) => `Q: ${f.question}\nA: ${f.answer}`).join("\n\n")
      : "";

    let websiteKnowledge = "";
    if (business.website_content) {
      try {
        const wk = JSON.parse(business.website_content);
        const parts: string[] = [];
        if (wk.description) parts.push(`About: ${wk.description}`);
        if (wk.hours) parts.push(`Hours: ${wk.hours}`);
        if (wk.location) parts.push(`Location: ${wk.location}`);
        if (wk.phone) parts.push(`Phone: ${wk.phone}`);
        if (wk.policies?.length) parts.push(`Policies:\n${wk.policies.map((p: string) => `- ${p}`).join("\n")}`);
        if (wk.services?.length) parts.push(`Services from website:\n${wk.services.map((s: any) => `- ${s.name}${s.price ? ` ($${s.price})` : ""}${s.description ? `: ${s.description}` : ""}`).join("\n")}`);
        if (wk.faqs?.length) parts.push(`FAQs from website:\n${wk.faqs.map((f: any) => `Q: ${f.question}\nA: ${f.answer}`).join("\n\n")}`);
        websiteKnowledge = parts.join("\n\n");
      } catch {}
    }

    // Fetch real-time availability for next 7 days
    let availabilityText = "";
    try {
      const baseUrl = business.availability_url
        ? (d: string) => `${business.availability_url}?date=${d}`
        : (d: string) => `https://hailey.tgordo03.workers.dev/api/public/availability?businessId=${businessId}&date=${d}`;

      const today = new Date();
      const daySlots: (string | null)[] = new Array(7).fill(null);
      await Promise.all(Array.from({ length: 7 }, (_, i) => {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        const dateStr = d.toISOString().split("T")[0];
        const label = d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
        return fetch(baseUrl(dateStr))
          .then(r => r.json())
          .then((data: any) => {
            if (data.slots?.length) {
              const fmt = (t: string) => { const [h, m] = t.split(":").map(Number); return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`; };
              const first = fmt(data.slots[0]);
              const last = fmt(data.slots[data.slots.length - 1]);
              daySlots[i] = first === last ? `${label}: ${first}` : `${label}: ${first} – ${last} (every 30 min)`;
            }
          })
          .catch(() => {});
      }));
      // Take the first 2 days that actually have openings, in chronological order
      const trimmed = (daySlots.filter(Boolean) as string[]).slice(0, 2);
      availabilityText = trimmed.length
        ? `## Availability (next 2 open days)\n${trimmed.join("\n")}\n\nSuggest times within these windows. Any 30-min slot in the range may be available — the system will confirm when booking.`
        : "## Availability\nNo open slots in the next 7 days — ask the client to check back soon.";
    } catch {}

    // Get Cloudflare Vectorize binding for RAG
    const ctx = await getCloudflareContext({ async: true });
    const vectorize = (ctx.env as any).VECTORIZE;

    // RAG: retrieve relevant knowledge chunks for this message
    let ragContext = "";
    if (vectorize) {
      ragContext = await retrieveRelevant(vectorize, db, businessId, message).catch(() => "");
    }

    // Inject current date/time in business timezone (default Eastern)
    const tz = business.timezone || "America/New_York";
    const nowLocal = new Date().toLocaleString("en-US", { timeZone: tz });
    const localDate = new Date(nowLocal);
    const todayLabel = localDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: tz });
    const tomorrowDate = new Date(localDate); tomorrowDate.setDate(localDate.getDate() + 1);
    const tomorrowLabel = tomorrowDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: tz });

    // Parse Hailey's self-awareness profile if available
    let profile: any = null;
    if (business.hailey_profile) {
      try { profile = JSON.parse(business.hailey_profile); } catch {}
    }

    // Owner-defined booking config takes priority over AI-generated profile
    const paymentRequired = business.booking_payment_required === 1 || profile?.payment_at_booking?.required === true;
    const paymentDetails = business.booking_payment_details ?? profile?.payment_at_booking?.details ?? "";
    const blockBookingWithoutPayment = paymentRequired;
    const smsConsentRequired = business.sms_consent_required === 1;
    const smsConsentText = (business.sms_consent_text as string | null)
      ?? "By providing your phone number you agree to receive text message updates about your appointment. Message & data rates may apply. Reply STOP to opt out.";

    const ownerFields = business.booking_fields_required as string | null;
    const bookingInfoRequired = ownerFields
      ? `Collect the following information from the client — ask one question at a time, in this order:\n${ownerFields}`
      : profile?.booking_info_required
        ? `Collect this information before booking (ask one at a time):\n${profile.booking_info_required}`
        : `Collect in order (one at a time):\n1. Preferred date and time\n2. Full name and email address\n3. What service or concern they need`;

    const systemPrompt = `You are Hailey, the AI receptionist for ${business.name}${business.city ? ` in ${business.city}${business.state ? ", " + business.state : ""}` : ""}.

## Current Date & Time
Today is ${todayLabel}. Tomorrow is ${tomorrowLabel}. Use these when a client says "today", "tomorrow", or names a day of the week.

${profile ? `## Who You Are & What You Do
${profile.what_we_do ?? ""}
${profile.who_we_are ? `\nTone & personality: ${profile.who_we_are}` : ""}
${profile.differentiators ? `\nWhat makes ${business.name} different: ${profile.differentiators}` : ""}` : `You represent ${business.name} professionally. Be warm, concise, and helpful.`}

## About ${business.name}
${business.phone ? `Phone (scheduling only — NOT an emergency line): ${business.phone}` : ""}
${business.address ? `Address: ${business.address}` : ""}

## Services
${servicesText}

## Hours
${hoursText}

${faqsText ? `## Frequently Asked Questions\n${faqsText}` : ""}
${websiteKnowledge ? `## Additional Knowledge from Website\n${websiteKnowledge}` : ""}
${ragContext ? `## Relevant Knowledge (retrieved for this question)\n${ragContext}` : ""}
${availabilityText ? `\n${availabilityText}` : ""}

${profile?.capabilities ? `## Your Capabilities\n${profile.capabilities}` : ""}
${profile?.never_do ? `## Never Do\n${profile.never_do}` : ""}
${profile?.objection_handling ? `## Handling Objections\n${profile.objection_handling}` : ""}
${profile?.intake_requirements ? `## Intake Requirements\n${profile.intake_requirements}` : ""}

## Booking Instructions — CRITICAL
You CAN and WILL book, cancel, and reschedule appointments directly. Do NOT say "I'll have someone follow up." You handle everything yourself.

### Booking a new appointment
${bookingInfoRequired}

CRITICAL COLLECTION RULES:
- Before asking ANYTHING, scan the entire conversation history above and mentally mark every field that has already been answered — including information shared before the client expressed intent to book.
- Only ask for fields that are still genuinely unknown. Skip everything already answered.
- Ask ONE question at a time. Never combine two questions into one message.
- Work through the remaining unanswered fields in order. Once a field is answered, move to the next.
- If the client's answer covers multiple fields at once, mark them all as collected.
- If all required fields were already provided in the conversation, go straight to confirming the appointment — do not re-ask anything.

${paymentRequired ? `### PAYMENT REQUIRED — Read carefully
This business requires payment before a booking is confirmed.
${paymentDetails ? `Payment details: ${paymentDetails}` : ""}
${blockBookingWithoutPayment
  ? `DO NOT output BOOKING_REQUEST until the client has acknowledged and agreed to the payment requirement. Ask them to confirm they understand and are ready to pay, then proceed.`
  : `Inform the client of the payment requirement before confirming. Once they acknowledge, proceed with booking.`}` : ""}

${smsConsentRequired ? `### SMS / Text Message Consent — REQUIRED
Before completing the booking, you MUST obtain explicit text message consent from the client. After collecting their phone number, present this exact disclosure and ask them to confirm:

"${smsConsentText}"

Ask: "Do you agree to receive text messages? (Yes / No)"
- If YES: proceed to confirm the booking and include smsConsent: true in the BOOKING_REQUEST.
- If NO: do not include their phone number in the booking, set smsConsent: false, and let them know appointment details will be sent by email only.
- DO NOT output BOOKING_REQUEST until consent has been explicitly given or declined.` : ""}

Once you have ALL required information (name, email, and anything listed above)${paymentRequired ? ", AND the client has acknowledged the payment requirement" : ""}${smsConsentRequired ? ", AND SMS consent has been confirmed or declined" : ""}, confirm the appointment in ONE sentence then — and ONLY then — output this on its own line:
BOOKING_REQUEST:{"date":"<YYYY-MM-DD>","time":"<HH:MM>","name":"<full name>","email":"<email>","phone":"<phone or null>","petName":"<pet name or null>","petType":"<animal type or null>","petBreed":"<breed or null>","petDob":"<YYYY-MM-DD or null>","petWeight":"<weight in lbs or null>","petSex":"<Male or Female or null>","petSpayedNeutered":"<Yes or No or null>","petColor":"<color or null>","pharmacyName":"<pharmacy name or null>","pharmacyAddress":"<pharmacy address or null>","service":"<service or concern>","smsConsent":<true|false|null>}

Fill every field you collected. Use null for anything not asked or not answered.

IMPORTANT: Do NOT output BOOKING_REQUEST if you are missing the client's full name or email address. Ask for them first.

### Cancelling or rescheduling
${profile?.cancellation_policy ? `Cancellation policy: ${profile.cancellation_policy}\n` : ""}If a client wants to cancel or reschedule:
1. Ask for their email address
2. Once you have it, output on its own line:
LOOKUP_APPOINTMENTS:{"email":"<email>"}
The system will look up their appointments. Wait — do not output anything else on that turn.
3. When you receive appointment data, list them and ask which one to cancel or reschedule.
4. For cancellation, once confirmed, output:
CANCEL_BOOKING:{"consultationId":"<id>","email":"<email>"}
5. For reschedule, collect the new date and time, then output:
RESCHEDULE_BOOKING:{"consultationId":"<id>","email":"<email>","date":"<YYYY-MM-DD>","time":"<HH:MM>"}

### Resend confirmation
If a client didn't receive their confirmation or join link, ask for their email and output:
RESEND_LINK:{"email":"<email>"}

Never ask for info you already have. Never say you'll follow up — you ARE the system.

## Urgency & Emergencies
${profile?.emergency_handling
  ? profile.emergency_handling
  : `If a client describes something urgent or dangerous, say "This sounds urgent — please seek emergency care right away." then provide any emergency contact found in the knowledge above. NEVER give the scheduling phone number for emergencies. Do NOT book a routine appointment.`}

${profile?.communication_style ? `## Communication Style\n${profile.communication_style}\n` : ""}## Response Length
Match your response length to what is actually needed:
- Simple questions (hours, price, location): 1-2 sentences.
- Listing multiple services, options, or policies: use a clear list, show everything — do not cut it short.
- Explaining a process or multiple steps: use as many sentences as needed to be complete and clear.
- Collecting booking info one field at a time: one question per message, brief.
Never truncate useful information. If there are 8 services, list all 8. If a policy has 3 parts, state all 3.
Use plain text only. No markdown whatsoever — no **, no *, no #, no bullet dashes, no backticks. The chat renders plain text only and markdown symbols will appear as raw characters.`;

    const cfMessages = [
      { role: "system", content: systemPrompt },
      ...(history.results as any[]).map((m: any) => {
        if (m.role === "appt_data") {
          return { role: "user", content: `[CONTEXT — internal appointment data. Use IDs only in CANCEL_BOOKING/RESCHEDULE_BOOKING tokens. Never show IDs to the client.]\n${m.content}` };
        }
        return { role: m.role === "assistant" ? "assistant" : "user", content: m.content };
      }),
      { role: "user", content: message },
    ];

    // Save user message
    await db.prepare(
      "INSERT INTO conversation_messages (id, conversation_id, role, content, created_at) VALUES (?, ?, 'user', ?, datetime('now'))"
    ).bind(generateId(), convId, message).run();

    await db.prepare("UPDATE conversations SET updated_at = datetime('now') WHERE id = ?").bind(convId).run();

    // Call OpenAI
    const assistantText: string = await chatCompletion(cfMessages as any, 512)
      .catch(() => "I'm having trouble responding right now. Please try again.");

    await db.prepare(
      "INSERT INTO conversation_messages (id, conversation_id, role, content, created_at) VALUES (?, ?, 'assistant', ?, datetime('now'))"
    ).bind(generateId(), convId, assistantText).run();

    let bookingConfirmed = null;
    let resendSent = false;

    // Handle resend link request
    const resendMatch = assistantText.match(/RESEND_LINK:(\{[^}]*\})/);
    if (resendMatch && business.booking_webhook_url) {
      try {
        const { email } = JSON.parse(resendMatch[1]);
        if (email) {
          const resendUrl = business.booking_webhook_url.replace(/\/guest$/, "/guest-resend");
          await fetch(resendUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-hailey-api-key": business.booking_webhook_key ?? "" },
            body: JSON.stringify({ email }),
          });
          resendSent = true;
        }
      } catch {}
    }

    // Handle appointment lookup (cancel/reschedule flow)
    let appointmentList: any[] = [];
    const lookupMatch = assistantText.match(/LOOKUP_APPOINTMENTS:(\{[^}]*\})/);
    if (lookupMatch && business.booking_webhook_url) {
      try {
        const { email } = JSON.parse(lookupMatch[1]);
        if (email) {
          const lookupUrl = business.booking_webhook_url.replace(/\/guest$/, "/email-lookup");
          const lookupRes = await fetch(`${lookupUrl}?email=${encodeURIComponent(email)}`, {
            headers: { "x-hailey-api-key": business.booking_webhook_key ?? "" },
          });
          if (lookupRes.ok) {
            const lookupData = await lookupRes.json() as any;
            appointmentList = lookupData.consultations ?? [];
          }
        }
      } catch {}
    }

    // Handle cancel
    const cancelMatch = assistantText.match(/CANCEL_BOOKING:(\{[^}]*\})/);
    if (cancelMatch && business.booking_webhook_url) {
      try {
        const cdata = JSON.parse(cancelMatch[1]);
        const cancelUrl = (business.booking_webhook_url as string).replace(/\/guest$/, "/guest-cancel");
        await fetch(cancelUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-hailey-api-key": business.booking_webhook_key ?? "" },
          body: JSON.stringify(cdata),
        });
      } catch {}
    }

    // Handle reschedule
    const rescheduleMatch = assistantText.match(/RESCHEDULE_BOOKING:(\{[^}]*\})/);
    if (rescheduleMatch && business.booking_webhook_url) {
      try {
        const rdata = JSON.parse(rescheduleMatch[1]);
        const rescheduleUrl = business.booking_webhook_url.replace(/\/guest$/, "/guest-reschedule");
        await fetch(rescheduleUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-hailey-api-key": business.booking_webhook_key ?? "" },
          body: JSON.stringify(rdata),
        });
      } catch {}
    }

    let pendingBooking: any = null;
    let bookingAgreements: any[] = [];

    const bookingMatch = assistantText.match(/BOOKING_REQUEST:(\{[\s\S]*?\})(?:\s|$)/);
    if (bookingMatch) {
      try {
        const bdata = JSON.parse(bookingMatch[1]);
        const { date, time, name, email, petName, petType, service } = bdata;

        if (date && time && name && email) {
          // If business requires agreements, return pendingBooking for widget to handle
          if (business.booking_agreements) {
            try { bookingAgreements = JSON.parse(business.booking_agreements); } catch {}
          }

          // If payment is required OR agreements exist, always send to widget payment flow — never auto-book
          const requiresPaymentFlow = bookingAgreements.length > 0 || paymentRequired;

          if (requiresPaymentFlow) {
            // Widget will show agreement/payment modal, then call /api/public/confirm-booking
            pendingBooking = { date, time, name, email, phone: bdata.phone ?? null, petName, petType,
              petBreed: bdata.petBreed ?? null, petDob: bdata.petDob ?? null, petWeight: bdata.petWeight ?? null,
              petSex: bdata.petSex ?? null, petSpayedNeutered: bdata.petSpayedNeutered ?? null, petColor: bdata.petColor ?? null,
              pharmacyName: bdata.pharmacyName ?? null, pharmacyAddress: bdata.pharmacyAddress ?? null,
              service, smsConsent: bdata.smsConsent ?? null, businessId };
          } else if (business.booking_webhook_url && business.booking_webhook_key) {
            // No agreements required — auto-book via webhook
            try {
              const webhookRes = await fetch(business.booking_webhook_url, {
                method: "POST",
                headers: { "Content-Type": "application/json", "x-hailey-api-key": business.booking_webhook_key },
                body: JSON.stringify({ name, email, petName, petType, concern: service, date, time }),
              });
              if (webhookRes.ok) {
                await db.prepare("UPDATE conversations SET status = 'booked' WHERE id = ?").bind(convId).run();
                bookingConfirmed = { date, time, name, email, service, petName, petType, isGuest: true };
              } else {
                const errBody = await webhookRes.text().catch(() => "");
                console.error("[booking webhook]", webhookRes.status, errBody);
              }
            } catch (webhookErr: any) {
              console.error("[booking webhook fetch error]", webhookErr?.message);
            }
          } else {
            // Native Hailey booking
            const taken = await db.prepare(
              "SELECT id FROM appointments WHERE business_id = ? AND date = ? AND time = ? AND status = 'confirmed'"
            ).bind(businessId, date, time).first();

            if (!taken) {
              let clientId: string | null = null;
              if (email) {
                const existing = await db.prepare(
                  "SELECT id FROM clients WHERE business_id = ? AND email = ?"
                ).bind(businessId, email).first<{ id: string }>();
                if (existing) {
                  clientId = existing.id;
                  await db.prepare("UPDATE clients SET name = ? WHERE id = ?").bind(name, clientId).run();
                } else {
                  clientId = generateId();
                  await db.prepare("INSERT INTO clients (id, business_id, name, email, created_at) VALUES (?, ?, ?, ?, datetime('now'))")
                    .bind(clientId, businessId, name, email).run();
                }
              }

              const apptId = generateId();
              await db.prepare(
                "INSERT INTO appointments (id, business_id, client_id, client_name, client_email, service_name, date, time, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'confirmed', datetime('now'))"
              ).bind(apptId, businessId, clientId, name, email ?? null, service ?? "Appointment", date, time).run();

              await db.prepare("UPDATE conversations SET status = 'booked' WHERE id = ?").bind(convId).run();
              bookingConfirmed = { appointmentId: apptId, date, time, name, email, service };

              // Send confirmation emails (non-blocking)
              const formattedDate = new Date(date + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
              const [th, tm] = time.split(":").map(Number);
              const formattedTime = `${th % 12 || 12}:${String(tm).padStart(2, "0")} ${th >= 12 ? "PM" : "AM"}`;

              const emailPromises: Promise<any>[] = [];

              // Email to client
              if (email) {
                emailPromises.push(sendEmail({
                  to: email,
                  subject: `Appointment Confirmed — ${business.name}`,
                  html: appointmentConfirmationEmail({
                    businessName: business.name,
                    clientName: name,
                    serviceName: service ?? "Appointment",
                    date: formattedDate,
                    time: formattedTime,
                    businessPhone: business.phone,
                  }),
                }).catch(() => {}));
              }

              // Email to business owner
              const ownerRow = await db.prepare("SELECT email FROM owners WHERE business_id = ? LIMIT 1").bind(businessId).first<{ email: string }>();
              if (ownerRow?.email) {
                emailPromises.push(sendEmail({
                  to: ownerRow.email,
                  subject: `New Booking — ${name} — ${formattedDate} at ${formattedTime}`,
                  html: `
                    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">
                      <h2 style="color:#111;">New appointment booked via Hailey</h2>
                      <div style="background:#f4f4f5;border-radius:8px;padding:16px;margin:16px 0;">
                        <p style="margin:4px 0;"><strong>Client:</strong> ${name}${email ? ` &lt;${email}&gt;` : ""}</p>
                        <p style="margin:4px 0;"><strong>Service:</strong> ${service ?? "Appointment"}</p>
                        <p style="margin:4px 0;"><strong>Date:</strong> ${formattedDate}</p>
                        <p style="margin:4px 0;"><strong>Time:</strong> ${formattedTime}</p>
                      </div>
                      <p style="color:#666;font-size:13px;">View it in your <a href="https://hailey.tgordo03.workers.dev/dashboard/appointments">Hailey dashboard</a>.</p>
                    </div>
                  `,
                }).catch(() => {}));
              }

              await Promise.all(emailPromises);
            }
          }
        }
      } catch {}
    }

    // If appointments were looked up, do a second AI call with the data
    let finalAssistantText = assistantText;
    if (lookupMatch && appointmentList.length >= 0) {
      const apptSummary = appointmentList.length === 0
        ? "No upcoming appointments found for that email address."
        : appointmentList.map((a: any, i: number) => {
            const [h, m] = a.time.split(":").map(Number);
            const ft = `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
            const fd = new Date(a.date + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
            return `${i + 1}. ID:${a.id} — ${fd} at ${ft} — ${a.pet_name} (${a.pet_type}) — ${a.concern} — Status: ${a.status}`;
          }).join("\n");

      // Persist raw appointment data so the next turn has IDs in context
      if (appointmentList.length > 0) {
        await db.prepare(
          "INSERT INTO conversation_messages (id, conversation_id, role, content, created_at) VALUES (?, ?, 'appt_data', ?, datetime('now'))"
        ).bind(generateId(), convId, apptSummary).run();
      }

      const followUpMessages = [
        { role: "system", content: systemPrompt },
        ...(history.results as any[]).map((m: any) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content })),
        { role: "user", content: message },
        { role: "assistant", content: assistantText.replace(/LOOKUP_APPOINTMENTS:\{[^}]*\}/, "").trim() },
        { role: "user", content: `[SYSTEM: Appointment lookup complete]\n${apptSummary}\n\nPresent these appointments to the client in plain language (date, time, pet name, concern) — do NOT show the ID to the client. The ID is for internal use only. Ask what they want to do (cancel or reschedule which one). Use the ID internally when outputting CANCEL_BOOKING or RESCHEDULE_BOOKING tokens.` },
      ];

      const followUpText: string = await chatCompletion(followUpMessages as any, 400).catch(() => apptSummary);

      finalAssistantText = followUpText;
      await db.prepare(
        "UPDATE conversation_messages SET content = ? WHERE conversation_id = ? AND role = 'assistant' ORDER BY created_at DESC LIMIT 1"
      ).bind(finalAssistantText, convId).run();
    }

    let displayText = finalAssistantText
      .replace(/BOOKING_REQUEST:\{[\s\S]*?\}(?=\s|$)/g, "")
      .replace(/BOOKING_LINK:\{[^}]*\}/g, "")
      .replace(/RESEND_LINK:\{[^}]*\}/g, "")
      .replace(/LOOKUP_APPOINTMENTS:\{[^}]*\}/g, "")
      .replace(/CANCEL_BOOKING:\{[^}]*\}/g, "")
      .replace(/RESCHEDULE_BOOKING:\{[^}]*\}/g, "")
      .replace(/\*\*(.+?)\*\*/g, "$1")
      .replace(/\*(.+?)\*/g, "$1")
      .replace(/^#{1,6}\s+/gm, "")
      .replace(/^[-*]\s+/gm, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    // If AI only output the token with no surrounding text, generate a fallback reply
    if (!displayText && bookingConfirmed) {
      const [th, tm] = (bookingConfirmed.time as string).split(":").map(Number);
      const ft = `${th % 12 || 12}:${String(tm).padStart(2, "0")} ${th >= 12 ? "PM" : "AM"}`;
      const fd = new Date((bookingConfirmed.date as string) + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
      displayText = bookingConfirmed.isGuest
        ? `You're all set! I've booked you for ${fd} at ${ft}. Check your email for your sign-in link to join the call.`
        : `You're all set! Your appointment is confirmed for ${fd} at ${ft}. See you then!`;
    }

    if (!displayText && pendingBooking) {
      displayText = "Almost there! Please review and accept the agreements below to confirm your appointment.";
    }

    if (!displayText && cancelMatch) {
      displayText = "Done! Your appointment has been cancelled and you'll receive a confirmation email shortly.";
    }

    if (!displayText && rescheduleMatch) {
      displayText = "Done! Your appointment has been rescheduled and you'll receive a confirmation email with the updated details.";
    }

    if (!displayText) displayText = "I'm having a bit of trouble right now. Please try again in a moment.";

    return NextResponse.json({
      reply: displayText,
      conversationId: convId,
      bookingConfirmed,
      resendSent,
      pendingBooking: pendingBooking ?? undefined,
      bookingAgreements: bookingAgreements.length > 0 ? bookingAgreements : undefined,
    }, { headers: CORS });
  } catch (err: any) {
    return NextResponse.json({ error: "Chat error: " + (err?.message ?? "unknown") }, { status: 500, headers: CORS });
  }
}
