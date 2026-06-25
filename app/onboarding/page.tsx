"use client";
import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";

const STEPS = ["Business Info", "Learn Your Site", "How You Book", "Availability", "Services", "Widget"];
const BOOKING_SYSTEMS = ["Custom / My own system", "Acuity Scheduling", "Jane App", "Square Appointments", "Calendly", "Mindbody", "Vagaro", "boulevard", "Other"];
const DAYS = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const DEFAULT_SCHEDULE = DAYS.map((_, i) => ({
  day_of_week: i, open_time: "09:00", close_time: "17:00", is_closed: i === 0 || i === 6,
}));
const INDUSTRIES = ["Veterinary","Pet Care","Medical","Dental","Beauty & Salon","Fitness","Legal","Consulting","Home Services","Restaurant","Retail","Other"];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);

  // Step 0 — Business info
  const [info, setInfo] = useState({ name: "", industry: "", phone: "", city: "", state: "", tagline: "" });
  const [infoSaving, setInfoSaving] = useState(false);
  const [infoError, setInfoError] = useState("");

  // Step 1 — Website
  const [url, setUrl] = useState("");
  const [scraping, setScraping] = useState(false);
  const [scraped, setScraped] = useState<any>(null);
  const [scrapeError, setScrapeError] = useState("");

  // Step 2 — Booking config
  const [booking, setBooking] = useState({
    system: "",
    fields: "",
    payment_required: false,
    payment_details: "",
    webhook_url: "",
    webhook_key: "",
  });
  const [bookingSaving, setBookingSaving] = useState(false);

  // Step 3 — Hours
  const [schedule, setSchedule] = useState(DEFAULT_SCHEDULE);
  const [hoursSaving, setHoursSaving] = useState(false);

  // Step 3 — Services
  const [services, setServices] = useState<Array<{ name: string; description: string; duration: string; price: string }>>([
    { name: "", description: "", duration: "30", price: "" },
  ]);
  const [servicesSaving, setServicesSaving] = useState(false);

  // Step 4 — Widget
  const [businessId, setBusinessId] = useState("");
  const [copied, setCopied] = useState(false);

  // ── Helpers ────────────────────────────────────────────────────────────────

  function updateDay(idx: number, field: string, value: any) {
    setSchedule(s => s.map((d, i) => i === idx ? { ...d, [field]: value } : d));
  }

  const fetchBusinessId = useCallback(async () => {
    const res = await fetch("/api/dashboard/settings");
    const data = await res.json() as any;
    if (data.business?.id) setBusinessId(data.business.id);
  }, []);

  // ── Step handlers ──────────────────────────────────────────────────────────

  async function saveInfo() {
    if (!info.name.trim()) { setInfoError("Business name is required."); return; }
    setInfoSaving(true); setInfoError("");
    const res = await fetch("/api/dashboard/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: info.name, industry: info.industry, phone: info.phone, city: info.city, state: info.state, tagline: info.tagline }),
    });
    setInfoSaving(false);
    if (res.ok) { setStep(1); fetchBusinessId(); }
    else setInfoError("Failed to save. Please try again.");
  }

  async function scrapeWebsite() {
    if (!url.trim()) { setStep(2); return; }
    setScraping(true); setScrapeError(""); setScraped(null);
    const res = await fetch("/api/dashboard/scrape", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    const data = await res.json() as any;
    setScraping(false);
    if (res.ok) { setScraped(data.knowledge); setStep(2); }
    else { setScrapeError(data.error ?? "Scrape failed."); }
  }

  async function saveBooking() {
    setBookingSaving(true);
    await fetch("/api/dashboard/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        booking_system: booking.system || null,
        booking_fields_required: booking.fields || null,
        booking_payment_required: booking.payment_required ? 1 : 0,
        booking_payment_details: booking.payment_details || null,
        booking_webhook_url: booking.webhook_url || null,
        booking_webhook_key: booking.webhook_key || null,
      }),
    });
    setBookingSaving(false);
    setStep(3);
  }

  async function saveHours() {
    setHoursSaving(true);
    await fetch("/api/dashboard/hours", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ schedule }),
    });
    setHoursSaving(false);
    setStep(4);
  }

  async function saveServices() {
    const valid = services.filter(s => s.name.trim());
    if (!valid.length) { setStep(5); return; }
    setServicesSaving(true);
    await Promise.all(valid.map(s =>
      fetch("/api/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: s.name,
          description: s.description,
          duration_minutes: parseInt(s.duration) || 30,
          price_cents: s.price ? Math.round(parseFloat(s.price) * 100) : 0,
        }),
      })
    ));
    // Mark onboarding complete
    await fetch("/api/dashboard/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ onboarding_complete: 1 }),
    });
    setServicesSaving(false);
    setStep(5);
    if (!businessId) fetchBusinessId();
  }

  const scriptTag = `<script src="https://hailey.tgordo03.workers.dev/widget.v2.js" data-business-id="${businessId}" async></script>`;

  function copyTag() {
    navigator.clipboard.writeText(scriptTag).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2500); });
  }

  // ── Progress bar ───────────────────────────────────────────────────────────

  const progress = ((step) / (STEPS.length - 1)) * 100;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4" style={{ background: "#04080f" }}>
      {/* Background orbs */}
      <div className="orb" style={{ width: 400, height: 400, background: "radial-gradient(circle, rgba(0,212,255,0.08) 0%, transparent 70%)", top: "10%", left: "5%" }} />
      <div className="orb" style={{ width: 300, height: 300, background: "radial-gradient(circle, rgba(123,47,255,0.08) 0%, transparent 70%)", bottom: "10%", right: "5%" }} />

      <div className="w-full max-w-xl lg:max-w-2xl relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-white text-lg" style={{ background: "linear-gradient(135deg,#00d4ff,#7b2fff)" }}>H</div>
            <span className="font-black text-2xl tracking-widest" style={{ color: "#00d4ff" }}>HAILEY</span>
          </div>
          <h1 className="font-black text-2xl text-white mb-1">Let's get you set up</h1>
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>Takes about 3 minutes</p>
        </div>

        {/* Step indicators */}
        <div className="flex items-center gap-1 mb-6">
          {STEPS.map((label, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div className={`h-1 w-full rounded-full transition-all duration-500 ${i <= step ? "bg-gradient-to-r from-cyan-400 to-purple-500" : "bg-white/10"}`} />
              <span className={`text-xs font-semibold hidden lg:block transition-colors truncate max-w-full text-center ${i === step ? "text-cyan-400" : i < step ? "text-white/40" : "text-white/20"}`}>{label}</span>
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="glass rounded-2xl p-8 relative overflow-hidden" style={{ border: "1px solid rgba(0,212,255,0.15)" }}>
          <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: "linear-gradient(90deg, transparent, #00d4ff, #7b2fff, transparent)" }} />

          {/* ── Step 0: Business Info ── */}
          {step === 0 && (
            <div>
              <h2 className="font-black text-xl text-white mb-1">Tell us about your business</h2>
              <p className="text-sm mb-6" style={{ color: "rgba(255,255,255,0.4)" }}>Hailey uses this to introduce herself to your customers.</p>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold mb-1.5 uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.5)" }}>Business Name *</label>
                  <input value={info.name} onChange={e => setInfo(p => ({ ...p, name: e.target.value }))}
                    placeholder="e.g. Paws & Claws Vet" className="w-full neon-input rounded-xl px-4 py-3 text-white text-sm"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(0,212,255,0.2)", outline: "none" }} />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1.5 uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.5)" }}>Industry</label>
                  <select value={info.industry} onChange={e => setInfo(p => ({ ...p, industry: e.target.value }))}
                    className="w-full neon-input rounded-xl px-4 py-3 text-sm"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(0,212,255,0.2)", outline: "none", color: info.industry ? "white" : "rgba(255,255,255,0.3)", colorScheme: "dark" }}>
                    <option value="">Select industry…</option>
                    {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold mb-1.5 uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.5)" }}>Phone</label>
                    <input value={info.phone} onChange={e => setInfo(p => ({ ...p, phone: e.target.value }))}
                      placeholder="(555) 000-0000" className="w-full neon-input rounded-xl px-4 py-3 text-white text-sm"
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(0,212,255,0.2)", outline: "none" }} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1.5 uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.5)" }}>City</label>
                    <input value={info.city} onChange={e => setInfo(p => ({ ...p, city: e.target.value }))}
                      placeholder="Miami" className="w-full neon-input rounded-xl px-4 py-3 text-white text-sm"
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(0,212,255,0.2)", outline: "none" }} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1.5 uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.5)" }}>One-line tagline <span style={{ color: "rgba(255,255,255,0.25)" }}>(optional)</span></label>
                  <input value={info.tagline} onChange={e => setInfo(p => ({ ...p, tagline: e.target.value }))}
                    placeholder="e.g. Compassionate care for your whole family" className="w-full neon-input rounded-xl px-4 py-3 text-white text-sm"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(0,212,255,0.2)", outline: "none" }} />
                </div>
              </div>
              {infoError && <p className="text-red-400 text-sm mt-3">{infoError}</p>}
              <button onClick={saveInfo} disabled={infoSaving} className="btn-neon w-full mt-6 py-4 rounded-xl font-black text-sm uppercase tracking-widest disabled:opacity-50">
                {infoSaving ? "Saving…" : "Continue →"}
              </button>
            </div>
          )}

          {/* ── Step 1: Website ── */}
          {step === 1 && (
            <div>
              <h2 className="font-black text-xl text-white mb-1">Teach Hailey your business</h2>
              <p className="text-sm mb-6" style={{ color: "rgba(255,255,255,0.4)" }}>Paste your website URL and Hailey will read your site — services, hours, FAQs, policies — so she can answer questions accurately.</p>

              <div className="flex gap-3 mb-4">
                <input value={url} onChange={e => setUrl(e.target.value)}
                  placeholder="https://yoursite.com"
                  className="flex-1 neon-input rounded-xl px-4 py-3 text-white text-sm"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(0,212,255,0.2)", outline: "none" }} />
                <button onClick={scrapeWebsite} disabled={scraping}
                  className="btn-neon px-5 py-3 rounded-xl font-black text-sm uppercase tracking-widest disabled:opacity-50 whitespace-nowrap">
                  {scraping ? "Reading…" : "Read Site"}
                </button>
              </div>

              {scraping && (
                <div className="rounded-xl p-4 mb-4" style={{ background: "rgba(0,212,255,0.04)", border: "1px solid rgba(0,212,255,0.12)" }}>
                  <div className="flex items-center gap-3 text-sm" style={{ color: "rgba(0,212,255,0.8)" }}>
                    <svg className="animate-spin w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3"/>
                      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                    </svg>
                    Crawling your website and extracting knowledge…
                  </div>
                </div>
              )}

              {scraped && (
                <div className="rounded-xl p-4 mb-4" style={{ background: "rgba(0,212,255,0.04)", border: "1px solid rgba(0,212,255,0.2)" }}>
                  <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: "#00d4ff" }}>✓ Hailey Learned:</p>
                  {scraped.description && <p className="text-sm text-white/70 mb-2">{scraped.description}</p>}
                  {scraped.services?.length > 0 && (
                    <p className="text-xs mb-1" style={{ color: "rgba(255,255,255,0.4)" }}>
                      <strong style={{ color: "rgba(255,255,255,0.6)" }}>Services:</strong> {scraped.services.map((s: any) => s.name).join(", ")}
                    </p>
                  )}
                  {scraped.faqs?.length > 0 && (
                    <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                      <strong style={{ color: "rgba(255,255,255,0.6)" }}>{scraped.faqs.length} FAQs</strong> extracted
                    </p>
                  )}
                </div>
              )}

              {scrapeError && <p className="text-red-400 text-sm mb-4">{scrapeError}</p>}

              <div className="flex gap-3">
                <button onClick={() => setStep(2)} className="flex-1 py-3 rounded-xl font-bold text-sm border transition-colors"
                  style={{ border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.4)", background: "transparent" }}>
                  Skip for now
                </button>
                {scraped && (
                  <button onClick={() => setStep(2)} className="btn-neon flex-1 py-3 rounded-xl font-black text-sm uppercase tracking-widest">
                    Continue →
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ── Step 2: How You Book ── */}
          {step === 2 && (
            <div>
              <h2 className="font-black text-xl text-white mb-1">How does your booking work?</h2>
              <p className="text-sm mb-6" style={{ color: "rgba(255,255,255,0.4)" }}>Hailey will ask clients exactly what your booking process requires — nothing more, nothing less.</p>
              <div className="space-y-5">

                <div>
                  <label className="block text-xs font-bold mb-1.5 uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.5)" }}>Booking system</label>
                  <select value={booking.system} onChange={e => setBooking(b => ({ ...b, system: e.target.value }))}
                    className="w-full neon-input rounded-xl px-4 py-3 text-sm"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(0,212,255,0.2)", outline: "none", color: booking.system ? "white" : "rgba(255,255,255,0.3)", colorScheme: "dark" }}>
                    <option value="">Select your booking system…</option>
                    {BOOKING_SYSTEMS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1.5 uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.5)" }}>
                    What info do you collect from clients?
                  </label>
                  <p className="text-xs mb-2" style={{ color: "rgba(255,255,255,0.3)" }}>
                    Paste your booking form fields here — Hailey will ask clients for exactly this info, in order.
                  </p>
                  <textarea
                    value={booking.fields}
                    onChange={e => setBooking(b => ({ ...b, fields: e.target.value }))}
                    rows={8}
                    placeholder={`Paste or type your form fields, e.g.:\n\nFull Name *\nEmail Address *\nPhone Number *\nPet's Name *\nAnimal Type (dog, cat, etc.) *\nBreed *\nDate of Birth *\nWeight (lbs) *\nSex *\nSpayed / Neutered *\nReason for visit *`}
                    className="w-full neon-input rounded-xl px-4 py-3 text-white text-sm font-mono resize-none"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(0,212,255,0.2)", outline: "none" }}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1.5 uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.5)" }}>Payment at booking?</label>
                  <div className="flex gap-3">
                    {["No", "Yes"].map(opt => (
                      <button key={opt} onClick={() => setBooking(b => ({ ...b, payment_required: opt === "Yes" }))}
                        className="flex-1 py-2.5 rounded-xl text-sm font-black uppercase tracking-widest transition-all"
                        style={((opt === "Yes") === booking.payment_required)
                          ? { background: "rgba(0,212,255,0.15)", color: "#00d4ff", border: "1px solid rgba(0,212,255,0.4)" }
                          : { background: "rgba(255,255,255,0.03)", color: "rgba(255,255,255,0.3)", border: "1px solid rgba(255,255,255,0.08)" }}>
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                {booking.payment_required && (
                  <div>
                    <label className="block text-xs font-bold mb-1.5 uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.5)" }}>Payment details</label>
                    <input
                      value={booking.payment_details}
                      onChange={e => setBooking(b => ({ ...b, payment_details: e.target.value }))}
                      placeholder="e.g. $50 deposit required via card on file before appointment is confirmed"
                      className="w-full neon-input rounded-xl px-4 py-3 text-white text-sm"
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(0,212,255,0.2)", outline: "none" }}
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold mb-1.5 uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.5)" }}>Booking webhook URL <span style={{ color: "rgba(255,255,255,0.25)" }}>(optional)</span></label>
                  <input
                    value={booking.webhook_url}
                    onChange={e => setBooking(b => ({ ...b, webhook_url: e.target.value }))}
                    placeholder="https://yoursite.com/api/bookings"
                    className="w-full neon-input rounded-xl px-4 py-3 text-white text-sm"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(0,212,255,0.2)", outline: "none" }}
                  />
                </div>

                {booking.webhook_url && (
                  <div>
                    <label className="block text-xs font-bold mb-1.5 uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.5)" }}>Webhook API key</label>
                    <input
                      value={booking.webhook_key}
                      onChange={e => setBooking(b => ({ ...b, webhook_key: e.target.value }))}
                      placeholder="Your API key"
                      className="w-full neon-input rounded-xl px-4 py-3 text-white text-sm"
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(0,212,255,0.2)", outline: "none" }}
                    />
                  </div>
                )}
              </div>

              <div className="flex gap-3 mt-6">
                <button onClick={() => setStep(3)} className="py-3 px-5 rounded-xl font-bold text-sm border"
                  style={{ border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.4)", background: "transparent" }}>
                  Skip
                </button>
                <button onClick={saveBooking} disabled={bookingSaving} className="btn-neon flex-1 py-4 rounded-xl font-black text-sm uppercase tracking-widest disabled:opacity-50">
                  {bookingSaving ? "Saving…" : "Save & Continue →"}
                </button>
              </div>
            </div>
          )}

          {/* ── Step 3: Hours ── */}
          {step === 3 && (
            <div>
              <h2 className="font-black text-xl text-white mb-1">Set your availability</h2>
              <p className="text-sm mb-6" style={{ color: "rgba(255,255,255,0.4)" }}>Hailey will only offer these time slots when clients ask about booking.</p>
              <div className="space-y-2.5">
                {schedule.map((day, idx) => (
                  <div key={day.day_of_week} className="flex items-center gap-2.5">
                    <div className="w-24 text-xs font-bold flex-shrink-0" style={{ color: day.is_closed ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.7)" }}>
                      {DAYS[day.day_of_week]}
                    </div>
                    <button onClick={() => updateDay(idx, "is_closed", !day.is_closed)}
                      className="text-xs font-black uppercase px-2.5 py-1.5 rounded-lg transition-all flex-shrink-0"
                      style={day.is_closed
                        ? { background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.25)", border: "1px solid rgba(255,255,255,0.08)" }
                        : { background: "rgba(0,212,255,0.12)", color: "#00d4ff", border: "1px solid rgba(0,212,255,0.3)" }}>
                      {day.is_closed ? "Closed" : "Open"}
                    </button>
                    {!day.is_closed && (
                      <>
                        <input type="time" value={day.open_time} onChange={e => updateDay(idx, "open_time", e.target.value)}
                          className="rounded-lg px-2 py-1.5 text-xs text-white flex-1"
                          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(0,212,255,0.2)", outline: "none", colorScheme: "dark" }} />
                        <span className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>–</span>
                        <input type="time" value={day.close_time} onChange={e => updateDay(idx, "close_time", e.target.value)}
                          className="rounded-lg px-2 py-1.5 text-xs text-white flex-1"
                          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(0,212,255,0.2)", outline: "none", colorScheme: "dark" }} />
                      </>
                    )}
                  </div>
                ))}
              </div>
              <button onClick={saveHours} disabled={hoursSaving} className="btn-neon w-full mt-6 py-4 rounded-xl font-black text-sm uppercase tracking-widest disabled:opacity-50">
                {hoursSaving ? "Saving…" : "Save Hours →"}
              </button>
            </div>
          )}

          {/* ── Step 4: Services ── */}
          {step === 4 && (
            <div>
              <h2 className="font-black text-xl text-white mb-1">Add your services</h2>
              <p className="text-sm mb-6" style={{ color: "rgba(255,255,255,0.4)" }}>Hailey will quote prices and book these services. You can add more later.</p>
              <div className="space-y-4">
                {services.map((svc, idx) => (
                  <div key={idx} className="rounded-xl p-4 relative" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    {services.length > 1 && (
                      <button onClick={() => setServices(s => s.filter((_, i) => i !== idx))}
                        className="absolute top-3 right-3 text-xs" style={{ color: "rgba(255,255,255,0.2)" }}>✕</button>
                    )}
                    <div className="space-y-3">
                      <input value={svc.name} onChange={e => setServices(s => s.map((x, i) => i === idx ? { ...x, name: e.target.value } : x))}
                        placeholder="Service name (e.g. Annual Wellness Exam)" className="w-full neon-input rounded-xl px-4 py-2.5 text-white text-sm"
                        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(0,212,255,0.15)", outline: "none" }} />
                      <input value={svc.description} onChange={e => setServices(s => s.map((x, i) => i === idx ? { ...x, description: e.target.value } : x))}
                        placeholder="Short description (optional)" className="w-full neon-input rounded-xl px-4 py-2.5 text-white text-sm"
                        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(0,212,255,0.15)", outline: "none" }} />
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs mb-1" style={{ color: "rgba(255,255,255,0.3)" }}>Duration (min)</label>
                          <input type="number" value={svc.duration} onChange={e => setServices(s => s.map((x, i) => i === idx ? { ...x, duration: e.target.value } : x))}
                            placeholder="30" className="w-full neon-input rounded-xl px-4 py-2.5 text-white text-sm"
                            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(0,212,255,0.15)", outline: "none" }} />
                        </div>
                        <div>
                          <label className="block text-xs mb-1" style={{ color: "rgba(255,255,255,0.3)" }}>Price ($)</label>
                          <input type="number" value={svc.price} onChange={e => setServices(s => s.map((x, i) => i === idx ? { ...x, price: e.target.value } : x))}
                            placeholder="0.00" className="w-full neon-input rounded-xl px-4 py-2.5 text-white text-sm"
                            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(0,212,255,0.15)", outline: "none" }} />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                <button onClick={() => setServices(s => [...s, { name: "", description: "", duration: "30", price: "" }])}
                  className="w-full py-2.5 rounded-xl text-sm font-bold transition-colors"
                  style={{ border: "1px dashed rgba(0,212,255,0.2)", color: "rgba(0,212,255,0.6)", background: "transparent" }}>
                  + Add another service
                </button>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => { setStep(5); fetchBusinessId(); }} className="py-3 px-5 rounded-xl font-bold text-sm border"
                  style={{ border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.4)", background: "transparent" }}>
                  Skip
                </button>
                <button onClick={saveServices} disabled={servicesSaving} className="btn-neon flex-1 py-3 rounded-xl font-black text-sm uppercase tracking-widest disabled:opacity-50">
                  {servicesSaving ? "Saving…" : "Save & Continue →"}
                </button>
              </div>
            </div>
          )}

          {/* ── Step 5: Widget ── */}
          {step === 5 && (
            <div>
              <div className="text-center mb-6">
                <div className="text-5xl mb-3">🚀</div>
                <h2 className="font-black text-xl text-white mb-1">Hailey is ready!</h2>
                <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>Copy this one-line script and paste it before the <code className="text-cyan-400">&lt;/body&gt;</code> tag on any website.</p>
              </div>

              <div className="rounded-xl p-4 mb-4 relative" style={{ background: "rgba(0,212,255,0.04)", border: "1px solid rgba(0,212,255,0.2)" }}>
                <p className="text-xs font-mono break-all" style={{ color: "rgba(0,212,255,0.8)" }}>{scriptTag}</p>
              </div>

              <button onClick={copyTag} className="btn-neon w-full py-3 rounded-xl font-black text-sm uppercase tracking-widest mb-3">
                {copied ? "✓ Copied!" : "Copy Script Tag"}
              </button>

              <div className="rounded-xl p-4 mb-6" style={{ background: "rgba(123,47,255,0.06)", border: "1px solid rgba(123,47,255,0.15)" }}>
                <p className="text-xs font-black uppercase tracking-widest mb-2" style={{ color: "#7b2fff" }}>What's included</p>
                <ul className="space-y-1">
                  {["Hailey knows your services, hours & FAQs","Books appointments in real-time","Answers questions from your website","Stores every conversation in your dashboard","One script tag — no code knowledge needed"].map(t => (
                    <li key={t} className="flex items-center gap-2 text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>
                      <span style={{ color: "#00d4ff" }}>✓</span> {t}
                    </li>
                  ))}
                </ul>
              </div>

              <button onClick={() => router.push("/dashboard")} className="w-full py-3 rounded-xl font-black text-sm uppercase tracking-widest"
                style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.08)" }}>
                Go to Dashboard →
              </button>
            </div>
          )}
        </div>

        <p className="text-center text-xs mt-4" style={{ color: "rgba(255,255,255,0.2)" }}>
          Already set up? <a href="/dashboard" className="underline hover:text-white/40 transition-colors">Skip to dashboard</a>
        </p>
      </div>
    </div>
  );
}
