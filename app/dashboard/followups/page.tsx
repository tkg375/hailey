"use client";
import { useState, useEffect } from "react";

const TRIGGER_LABELS: Record<string, string> = {
  post_visit: "After every appointment",
  no_show: "When client no-shows",
  reengagement: "When client goes quiet (60+ days)",
};

const TRIGGER_ICONS: Record<string, string> = {
  post_visit: "✅",
  no_show: "⚠️",
  reengagement: "💌",
};

interface Sequence { trigger: string; active: number; }

export default function FollowupsPage() {
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [loading, setLoading] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/dashboard/followups").then(r => r.json()).then((d: any) => setSequences(d.sequences ?? [])).catch(() => {});
  }, []);

  async function toggle(trigger: string) {
    setLoading(trigger);
    const res = await fetch("/api/dashboard/followups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trigger }),
    });
    const data = await res.json() as any;
    setSequences(prev => {
      const rest = prev.filter(s => s.trigger !== trigger);
      return [...rest, { trigger, active: data.active }];
    });
    setLoading(null);
  }

  return (
    <>
      <div className="mb-8">
        <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "rgba(0,212,255,0.5)" }}>// FOLLOW-UPS</p>
        <h1 className="text-2xl md:text-3xl font-black text-white">Follow-Up Sequences</h1>
        <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.35)" }}>Automated messages that go out after appointments or inactivity. Hailey sends these on her own once turned on.</p>
      </div>

      <div className="space-y-4 mb-8">
        {Object.entries(TRIGGER_LABELS).map(([trigger, label]) => {
          const seq = sequences.find((s) => s.trigger === trigger);
          const active = !!seq?.active;
          return (
            <div key={trigger} className="glass rounded-2xl p-5 flex items-center justify-between" style={{ border: "1px solid rgba(0,212,255,0.1)" }}>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0" style={{ background: "rgba(0,212,255,0.08)" }}>
                  {TRIGGER_ICONS[trigger]}
                </div>
                <div>
                  <div className="font-bold text-sm text-white">{label}</div>
                  <div className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>
                    {active ? "Hailey is sending these automatically" : "Turned off — Hailey won't send these"}
                  </div>
                </div>
              </div>
              <button
                onClick={() => toggle(trigger)}
                disabled={loading === trigger}
                className="text-xs font-black uppercase px-3 py-1.5 rounded-lg flex-shrink-0 transition-colors disabled:opacity-50"
                style={active
                  ? { background: "rgba(0,212,255,0.12)", color: "#00d4ff", border: "1px solid rgba(0,212,255,0.3)" }
                  : { background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.4)", border: "1px solid rgba(255,255,255,0.08)" }
                }
              >
                {loading === trigger ? "..." : active ? "Active" : "Inactive"}
              </button>
            </div>
          );
        })}
      </div>

      <div className="glass rounded-2xl p-8 text-center" style={{ border: "1px solid rgba(123,47,255,0.2)" }}>
        <div className="text-3xl mb-3">✉️</div>
        <p className="font-black text-white mb-2">Custom message editor coming soon</p>
        <p className="text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>Right now each sequence sends a default message when toggled on. Custom timing, wording, and SMS are next.</p>
      </div>
    </>
  );
}
