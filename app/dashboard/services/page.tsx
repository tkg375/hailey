"use client";
import { useState, useEffect, useCallback } from "react";

interface Service { id: string; name: string; description: string; duration_minutes: number; price_cents: number; active: number; }

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", duration_minutes: "60", price_cents: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/services");
    const data = await res.json() as any;
    setServices(data.services ?? []);
  }, []);

  useEffect(() => { load(); }, [load]);

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })); }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/services", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, price_cents: Math.round(parseFloat(form.price_cents || "0") * 100), duration_minutes: parseInt(form.duration_minutes) }),
    });
    const data = await res.json() as any;
    if (!res.ok) { setError(data.error ?? "Failed"); setLoading(false); return; }
    setForm({ name: "", description: "", duration_minutes: "60", price_cents: "" });
    setShowForm(false);
    setLoading(false);
    load();
  }

  async function toggleActive(id: string, active: number) {
    await fetch(`/api/services/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active: active ? 0 : 1 }) });
    load();
  }

  const inputClass = "w-full rounded-xl px-4 py-3 text-sm text-white neon-input";
  const inputStyle = { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(0,212,255,0.2)", outline: "none" };
  const labelClass = "block text-xs font-black uppercase tracking-widest mb-2";
  const labelStyle = { color: "rgba(0,212,255,0.6)" };

  return (
    <>
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "rgba(0,212,255,0.5)" }}>// SERVICES</p>
          <h1 className="text-2xl md:text-3xl font-black text-white">Your Services</h1>
        </div>
        <button onClick={() => setShowForm(s => !s)} className="btn-neon px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest">
          {showForm ? "Cancel" : "+ Add Service"}
        </button>
      </div>

      {showForm && (
        <div className="glass rounded-2xl p-6 mb-6 relative overflow-hidden" style={{ border: "1px solid rgba(0,212,255,0.2)" }}>
          <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: "linear-gradient(90deg, transparent, #00d4ff, #7b2fff, transparent)" }} />
          <form onSubmit={handleAdd} className="space-y-4">
            {error && <div className="px-4 py-3 rounded-xl text-sm" style={{ background: "rgba(255,0,110,0.12)", border: "1px solid rgba(255,0,110,0.3)", color: "#ff4d8d" }}>{error}</div>}
            <div>
              <label className={labelClass} style={labelStyle}>Service Name</label>
              <input required value={form.name} onChange={e => set("name", e.target.value)} className={inputClass} style={inputStyle} placeholder="e.g. Full Groom" />
            </div>
            <div>
              <label className={labelClass} style={labelStyle}>Description</label>
              <input value={form.description} onChange={e => set("description", e.target.value)} className={inputClass} style={inputStyle} placeholder="Brief description..." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass} style={labelStyle}>Duration (min)</label>
                <input required type="number" min="5" value={form.duration_minutes} onChange={e => set("duration_minutes", e.target.value)} className={inputClass} style={inputStyle} />
              </div>
              <div>
                <label className={labelClass} style={labelStyle}>Price ($)</label>
                <input type="number" min="0" step="0.01" value={form.price_cents} onChange={e => set("price_cents", e.target.value)} className={inputClass} style={inputStyle} placeholder="0.00" />
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn-neon w-full py-3.5 rounded-xl font-black text-sm uppercase tracking-widest disabled:opacity-50">
              {loading ? "Saving..." : "Add Service →"}
            </button>
          </form>
        </div>
      )}

      {services.length === 0 ? (
        <div className="glass rounded-2xl p-16 text-center" style={{ border: "1px solid rgba(0,212,255,0.12)" }}>
          <div className="text-5xl mb-4">✦</div>
          <p className="font-black text-white text-lg mb-2">No services yet</p>
          <p className="text-sm mb-6" style={{ color: "rgba(255,255,255,0.35)" }}>Add your services so Hailey knows what you offer and how to book them.</p>
          <button onClick={() => setShowForm(true)} className="btn-neon px-6 py-3 rounded-xl text-sm font-black uppercase tracking-widest">
            Add first service →
          </button>
        </div>
      ) : (
        <div className="glass rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(0,212,255,0.12)" }}>
          {services.map((s, i) => (
            <div key={s.id} className="flex items-center justify-between px-5 py-4 hover:bg-white/5 transition-colors" style={{ borderBottom: i < services.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none", opacity: s.active ? 1 : 0.4 }}>
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs flex-shrink-0" style={{ background: "rgba(0,212,255,0.1)", color: "#00d4ff" }}>✦</div>
                <div className="min-w-0">
                  <div className="font-bold text-sm text-white truncate">{s.name}</div>
                  <div className="text-xs truncate" style={{ color: "rgba(255,255,255,0.35)" }}>{s.duration_minutes} min · {s.description}</div>
                </div>
              </div>
              <div className="flex items-center gap-4 flex-shrink-0 ml-4">
                <div className="text-right hidden sm:block">
                  <div className="text-sm font-black" style={{ color: "#00d4ff" }}>${(s.price_cents / 100).toFixed(0)}</div>
                </div>
                <button
                  onClick={() => toggleActive(s.id, s.active)}
                  className="text-xs font-black uppercase px-3 py-1.5 rounded-lg transition-all"
                  style={s.active
                    ? { background: "rgba(0,212,255,0.12)", color: "#00d4ff", border: "1px solid rgba(0,212,255,0.3)" }
                    : { background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.3)", border: "1px solid rgba(255,255,255,0.1)" }
                  }
                >
                  {s.active ? "Active" : "Off"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
