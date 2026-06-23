"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function NewAppointmentPage() {
  const router = useRouter();
  const [services, setServices] = useState<any[]>([]);
  const [form, setForm] = useState({ clientName: "", clientEmail: "", clientPhone: "", serviceId: "", date: "", time: "", notes: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/services").then(r => r.json()).then((d: any) => setServices(d.services ?? []));
  }, []);

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json() as any;
    if (!res.ok) { setError(data.error ?? "Failed to book"); setLoading(false); return; }
    router.push("/dashboard/appointments");
  }

  const inputClass = "w-full rounded-xl px-4 py-3 text-sm text-white neon-input";
  const inputStyle = { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(0,212,255,0.2)", outline: "none" };
  const labelClass = "block text-xs font-black uppercase tracking-widest mb-2";
  const labelStyle = { color: "rgba(0,212,255,0.6)" };

  return (
    <>
      <div className="flex items-center gap-4 mb-8">
        <Link href="/dashboard/appointments" className="text-sm font-bold hover:text-white transition-colors" style={{ color: "rgba(255,255,255,0.3)" }}>← Back</Link>
        <div>
          <p className="text-xs font-bold uppercase tracking-widest mb-0.5" style={{ color: "rgba(0,212,255,0.5)" }}>// NEW APPOINTMENT</p>
          <h1 className="text-2xl font-black text-white">Book Manually</h1>
        </div>
      </div>

      <div className="max-w-lg">
        <div className="glass rounded-2xl p-8 relative overflow-hidden" style={{ border: "1px solid rgba(0,212,255,0.2)" }}>
          <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: "linear-gradient(90deg, transparent, #00d4ff, #7b2fff, transparent)" }} />

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="px-4 py-3 rounded-xl text-sm font-semibold" style={{ background: "rgba(255,0,110,0.12)", border: "1px solid rgba(255,0,110,0.3)", color: "#ff4d8d" }}>
                {error}
              </div>
            )}
            <div>
              <label className={labelClass} style={labelStyle}>Client Name</label>
              <input required value={form.clientName} onChange={e => set("clientName", e.target.value)} className={inputClass} style={inputStyle} placeholder="Sarah Johnson" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass} style={labelStyle}>Email</label>
                <input type="email" value={form.clientEmail} onChange={e => set("clientEmail", e.target.value)} className={inputClass} style={inputStyle} placeholder="sarah@..." />
              </div>
              <div>
                <label className={labelClass} style={labelStyle}>Phone</label>
                <input type="tel" value={form.clientPhone} onChange={e => set("clientPhone", e.target.value)} className={inputClass} style={inputStyle} placeholder="(555) 555-5555" />
              </div>
            </div>
            <div>
              <label className={labelClass} style={labelStyle}>Service</label>
              <select value={form.serviceId} onChange={e => set("serviceId", e.target.value)} className={inputClass} style={{ ...inputStyle, colorScheme: "dark" }}>
                <option value="" style={{ background: "#0d1117" }}>Select a service...</option>
                {services.map((s: any) => (
                  <option key={s.id} value={s.id} style={{ background: "#0d1117" }}>{s.name} — ${(s.price_cents / 100).toFixed(0)}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass} style={labelStyle}>Date</label>
                <input required type="date" value={form.date} onChange={e => set("date", e.target.value)} className={inputClass} style={{ ...inputStyle, colorScheme: "dark" }} />
              </div>
              <div>
                <label className={labelClass} style={labelStyle}>Time</label>
                <input required type="time" value={form.time} onChange={e => set("time", e.target.value)} className={inputClass} style={{ ...inputStyle, colorScheme: "dark" }} />
              </div>
            </div>
            <div>
              <label className={labelClass} style={labelStyle}>Notes <span style={{ color: "rgba(255,255,255,0.2)", textTransform: "none", fontWeight: 400 }}>(optional)</span></label>
              <textarea value={form.notes} onChange={e => set("notes", e.target.value)} className={inputClass} style={{ ...inputStyle, resize: "none" }} rows={3} placeholder="Any special notes..." />
            </div>
            <button type="submit" disabled={loading} className="btn-neon w-full py-4 rounded-xl font-black text-sm uppercase tracking-widest disabled:opacity-50 mt-2">
              {loading ? "Booking..." : "Book Appointment →"}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
