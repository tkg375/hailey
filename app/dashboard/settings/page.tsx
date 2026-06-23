"use client";
import { useState, useEffect, useCallback } from "react";

const DAYS = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const DEFAULT_SCHEDULE = DAYS.map((_, i) => ({
  day_of_week: i, open_time: "09:00", close_time: "17:00", is_closed: i === 0 || i === 6,
}));

interface Business {
  name: string; industry: string; email: string; phone: string;
  address: string; city: string; state: string; timezone: string;
  tagline: string; website_url: string; website_scraped_at: string; website_content: string;
}

export default function SettingsPage() {
  const [business, setBusiness] = useState<Partial<Business>>({});
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [scraping, setScraping] = useState(false);
  const [scrapeResult, setScrapeResult] = useState<any>(null);
  const [scrapeError, setScrapeError] = useState("");
  const [pagesScraped, setPagesScraped] = useState<number | null>(null);
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [schedule, setSchedule] = useState(DEFAULT_SCHEDULE);
  const [hoursSaved, setHoursSaved] = useState(false);
  const [hoursSaving, setHoursSaving] = useState(false);

  const loadHours = useCallback(async () => {
    const res = await fetch("/api/dashboard/hours");
    const data = await res.json() as any;
    if (data.hours?.length) {
      setSchedule(prev => prev.map(d => {
        const found = data.hours.find((h: any) => h.day_of_week === d.day_of_week);
        return found ? { ...d, open_time: found.open_time ?? "09:00", close_time: found.close_time ?? "17:00", is_closed: !!found.is_closed } : d;
      }));
    }
  }, []);

  useEffect(() => {
    fetch("/api/dashboard/settings").then(r => r.json()).then((d: any) => {
      setBusiness(d.business ?? {});
      setWebsiteUrl(d.business?.website_url ?? "");
    });
    loadHours();
  }, [loadHours]);

  async function saveHours() {
    setHoursSaving(true);
    await fetch("/api/dashboard/hours", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ schedule }),
    });
    setHoursSaving(false);
    setHoursSaved(true);
    setTimeout(() => setHoursSaved(false), 3000);
  }

  function updateDay(idx: number, field: string, value: any) {
    setSchedule(s => s.map((d, i) => i === idx ? { ...d, [field]: value } : d));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/dashboard/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(business),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  async function handleScrape() {
    if (!websiteUrl) return;
    setScraping(true);
    setScrapeError("");
    setScrapeResult(null);
    const res = await fetch("/api/dashboard/scrape", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ websiteUrl }),
    });
    const data = await res.json() as any;
    setScraping(false);
    if (!res.ok) { setScrapeError(data.error ?? "Failed"); return; }
    setScrapeResult(data.knowledge);
    setPagesScraped(data.pagesScraped ?? null);
    setBusiness(b => ({ ...b, website_url: websiteUrl }));
  }

  function set(k: keyof Business, v: string) { setBusiness(b => ({ ...b, [k]: v })); }

  const inputClass = "w-full rounded-xl px-4 py-3 text-sm text-white neon-input";
  const inputStyle = { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(0,212,255,0.2)", outline: "none" };
  const labelClass = "block text-xs font-black uppercase tracking-widest mb-2";
  const labelStyle = { color: "rgba(0,212,255,0.6)" };

  const knowledge = scrapeResult ?? (business.website_content ? JSON.parse(business.website_content) : null);

  return (
    <>
      <div className="mb-8">
        <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "rgba(0,212,255,0.5)" }}>// SETTINGS</p>
        <h1 className="text-2xl md:text-3xl font-black text-white">Business Settings</h1>
      </div>

      <div className="space-y-6 max-w-2xl">
        {/* Website Knowledge */}
        <div className="glass rounded-2xl p-6 relative overflow-hidden" style={{ border: "1px solid rgba(0,212,255,0.25)" }}>
          <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: "linear-gradient(90deg, transparent, #00d4ff, #7b2fff, transparent)" }} />
          <h2 className="font-black text-white mb-1">🌐 Website Knowledge</h2>
          <p className="text-xs mb-4" style={{ color: "rgba(255,255,255,0.4)" }}>
            Hailey will crawl your site and learn your services, pricing, hours, and FAQs so she can answer any question a client might ask.
          </p>
          <div className="flex gap-3">
            <input
              type="url"
              value={websiteUrl}
              onChange={e => setWebsiteUrl(e.target.value)}
              className="flex-1 rounded-xl px-4 py-3 text-sm text-white neon-input"
              style={inputStyle}
              placeholder="https://yourbusiness.com"
            />
            <button
              onClick={handleScrape}
              disabled={scraping || !websiteUrl}
              className="btn-neon px-5 py-3 rounded-xl text-xs font-black uppercase tracking-widest disabled:opacity-50 whitespace-nowrap"
            >
              {scraping ? "Scanning..." : "Sync Site"}
            </button>
          </div>

          {scrapeError && (
            <div className="mt-3 px-4 py-3 rounded-xl text-sm" style={{ background: "rgba(255,0,110,0.12)", border: "1px solid rgba(255,0,110,0.3)", color: "#ff4d8d" }}>{scrapeError}</div>
          )}

          {knowledge && (
            <div className="mt-4 space-y-3">
              <p className="text-xs font-black uppercase tracking-widest" style={{ color: "#22c55e" }}>✓ Knowledge synced{pagesScraped ? ` — ${pagesScraped} pages crawled` : ""} — Hailey now knows:</p>
              {knowledge.description && (
                <div className="rounded-xl p-3 text-xs" style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.6)" }}>
                  {knowledge.description}
                </div>
              )}
              <div className="flex gap-4 text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                {knowledge.services?.length > 0 && <span style={{ color: "#00d4ff" }}>✓ {knowledge.services.length} services</span>}
                {knowledge.faqs?.length > 0 && <span style={{ color: "#7b2fff" }}>✓ {knowledge.faqs.length} FAQs</span>}
                {knowledge.hours && <span style={{ color: "#ff006e" }}>✓ Hours</span>}
                {knowledge.phone && <span style={{ color: "#22c55e" }}>✓ Phone</span>}
              </div>
              {business.website_scraped_at && !scrapeResult && (
                <p className="text-xs" style={{ color: "rgba(255,255,255,0.2)" }}>Last synced: {new Date(business.website_scraped_at).toLocaleString()}</p>
              )}
            </div>
          )}
        </div>

        {/* Hours / Availability */}
        <div className="glass rounded-2xl p-6 relative overflow-hidden" style={{ border: "1px solid rgba(123,47,255,0.2)" }}>
          <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: "linear-gradient(90deg, transparent, #7b2fff, transparent)" }} />
          <h2 className="font-black text-white mb-1">🕐 Availability Hours</h2>
          <p className="text-xs mb-5" style={{ color: "rgba(255,255,255,0.4)" }}>
            Hailey will only offer these time slots when clients ask about booking.
          </p>
          <div className="space-y-3">
            {schedule.map((day, idx) => (
              <div key={day.day_of_week} className="flex items-center gap-3">
                <div className="w-24 text-xs font-bold" style={{ color: day.is_closed ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.7)" }}>
                  {DAYS[day.day_of_week]}
                </div>
                <button
                  onClick={() => updateDay(idx, "is_closed", !day.is_closed)}
                  className="text-xs font-black uppercase px-2.5 py-1.5 rounded-lg transition-all flex-shrink-0"
                  style={day.is_closed
                    ? { background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.25)", border: "1px solid rgba(255,255,255,0.08)" }
                    : { background: "rgba(0,212,255,0.12)", color: "#00d4ff", border: "1px solid rgba(0,212,255,0.3)" }
                  }
                >
                  {day.is_closed ? "Closed" : "Open"}
                </button>
                {!day.is_closed && (
                  <>
                    <input type="time" value={day.open_time} onChange={e => updateDay(idx, "open_time", e.target.value)}
                      className="rounded-lg px-3 py-1.5 text-xs text-white neon-input"
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(0,212,255,0.2)", outline: "none", colorScheme: "dark" }} />
                    <span className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>to</span>
                    <input type="time" value={day.close_time} onChange={e => updateDay(idx, "close_time", e.target.value)}
                      className="rounded-lg px-3 py-1.5 text-xs text-white neon-input"
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(0,212,255,0.2)", outline: "none", colorScheme: "dark" }} />
                  </>
                )}
              </div>
            ))}
          </div>
          <button onClick={saveHours} disabled={hoursSaving}
            className="btn-neon mt-5 w-full py-3 rounded-xl font-black text-sm uppercase tracking-widest disabled:opacity-50">
            {hoursSaved ? "✓ Hours Saved!" : hoursSaving ? "Saving..." : "Save Hours →"}
          </button>
        </div>

        {/* Business info */}
        <form onSubmit={handleSave} className="glass rounded-2xl p-6 space-y-4 relative overflow-hidden" style={{ border: "1px solid rgba(0,212,255,0.12)" }}>
          <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: "linear-gradient(90deg, transparent, rgba(0,212,255,0.3), transparent)" }} />
          <h2 className="font-black text-white">Business Info</h2>

          <div>
            <label className={labelClass} style={labelStyle}>Business Name</label>
            <input value={business.name ?? ""} onChange={e => set("name", e.target.value)} className={inputClass} style={inputStyle} />
          </div>
          <div>
            <label className={labelClass} style={labelStyle}>Tagline</label>
            <input value={business.tagline ?? ""} onChange={e => set("tagline", e.target.value)} className={inputClass} style={inputStyle} placeholder="e.g. Atlanta's favorite pet groomers" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass} style={labelStyle}>Phone</label>
              <input value={business.phone ?? ""} onChange={e => set("phone", e.target.value)} className={inputClass} style={inputStyle} placeholder="(555) 555-5555" />
            </div>
            <div>
              <label className={labelClass} style={labelStyle}>Email</label>
              <input type="email" value={business.email ?? ""} onChange={e => set("email", e.target.value)} className={inputClass} style={inputStyle} />
            </div>
          </div>
          <div>
            <label className={labelClass} style={labelStyle}>Address</label>
            <input value={business.address ?? ""} onChange={e => set("address", e.target.value)} className={inputClass} style={inputStyle} placeholder="123 Main St" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass} style={labelStyle}>City</label>
              <input value={business.city ?? ""} onChange={e => set("city", e.target.value)} className={inputClass} style={inputStyle} />
            </div>
            <div>
              <label className={labelClass} style={labelStyle}>State</label>
              <input value={business.state ?? ""} onChange={e => set("state", e.target.value)} className={inputClass} style={inputStyle} placeholder="GA" maxLength={2} />
            </div>
          </div>

          <button type="submit" disabled={saving} className="btn-neon w-full py-4 rounded-xl font-black text-sm uppercase tracking-widest disabled:opacity-50">
            {saved ? "✓ Saved!" : saving ? "Saving..." : "Save Settings →"}
          </button>
        </form>
      </div>
    </>
  );
}
