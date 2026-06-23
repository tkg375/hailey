"use client";
import { useState, useEffect } from "react";

interface Chunk {
  id: string;
  content: string;
  source_type: string;
  source_label: string;
  created_at: string;
}

export default function KnowledgePage() {
  const [chunks, setChunks] = useState<Chunk[]>([]);
  const [loading, setLoading] = useState(true);
  const [customText, setCustomText] = useState("");
  const [customLabel, setCustomLabel] = useState("");
  const [adding, setAdding] = useState(false);
  const [addMsg, setAddMsg] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function loadChunks() {
    setLoading(true);
    const res = await fetch("/api/dashboard/knowledge");
    const data = await res.json() as any;
    setChunks(data.chunks ?? []);
    setLoading(false);
  }

  useEffect(() => { loadChunks(); }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!customText.trim()) return;
    setAdding(true);
    setAddMsg("");
    const res = await fetch("/api/dashboard/knowledge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: customText, sourceLabel: customLabel || "Custom" }),
    });
    const data = await res.json() as any;
    setAdding(false);
    if (!res.ok) { setAddMsg(data.error ?? "Failed"); return; }
    setAddMsg(`✓ Added ${data.chunksAdded} chunk${data.chunksAdded !== 1 ? "s" : ""} to Hailey's knowledge`);
    setCustomText("");
    setCustomLabel("");
    loadChunks();
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    await fetch(`/api/dashboard/knowledge?id=${id}`, { method: "DELETE" });
    setDeletingId(null);
    setChunks(c => c.filter(ch => ch.id !== id));
  }

  async function handleClearWebsite() {
    if (!confirm("Remove all website-scraped knowledge chunks? You can re-scrape from Settings.")) return;
    await fetch("/api/dashboard/knowledge?sourceType=website", { method: "DELETE" });
    loadChunks();
  }

  const sourceColor = (t: string) => {
    if (t === "website") return { color: "#00d4ff", bg: "rgba(0,212,255,0.08)", border: "rgba(0,212,255,0.25)" };
    if (t === "manual") return { color: "#7b2fff", bg: "rgba(123,47,255,0.08)", border: "rgba(123,47,255,0.25)" };
    if (t === "faq") return { color: "#ff006e", bg: "rgba(255,0,110,0.08)", border: "rgba(255,0,110,0.25)" };
    return { color: "#22c55e", bg: "rgba(34,197,94,0.08)", border: "rgba(34,197,94,0.25)" };
  };

  const websiteCount = chunks.filter(c => c.source_type === "website").length;
  const manualCount = chunks.filter(c => c.source_type === "manual").length;

  return (
    <>
      <div className="mb-8">
        <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "rgba(0,212,255,0.5)" }}>// KNOWLEDGE BASE</p>
        <h1 className="text-2xl md:text-3xl font-black text-white">What Hailey Knows</h1>
        <p className="text-sm mt-2" style={{ color: "rgba(255,255,255,0.4)" }}>
          Hailey searches this knowledge base for every visitor message — she'll answer anything you've taught her.
        </p>
      </div>

      <div className="space-y-6 max-w-3xl">

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Total chunks", value: chunks.length, color: "#00d4ff" },
            { label: "From website", value: websiteCount, color: "#7b2fff" },
            { label: "Custom added", value: manualCount, color: "#22c55e" },
          ].map(s => (
            <div key={s.label} className="glass rounded-2xl p-4 text-center" style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="text-2xl font-black" style={{ color: s.color }}>{s.value}</div>
              <div className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.35)" }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Add custom knowledge */}
        <div className="glass rounded-2xl p-6 relative overflow-hidden" style={{ border: "1px solid rgba(123,47,255,0.25)" }}>
          <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: "linear-gradient(90deg, transparent, #7b2fff, transparent)" }} />
          <h2 className="font-black text-white mb-1">+ Add Custom Knowledge</h2>
          <p className="text-xs mb-4" style={{ color: "rgba(255,255,255,0.4)" }}>
            Paste in policies, FAQs, pricing details, staff bios, product descriptions — anything you want Hailey to know. She'll retrieve the relevant parts for each conversation.
          </p>
          <form onSubmit={handleAdd} className="space-y-3">
            <input
              type="text"
              value={customLabel}
              onChange={e => setCustomLabel(e.target.value)}
              placeholder="Label (e.g. Cancellation Policy, Pricing 2025)"
              className="w-full rounded-xl px-4 py-3 text-sm text-white"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(123,47,255,0.2)", outline: "none" }}
            />
            <textarea
              value={customText}
              onChange={e => setCustomText(e.target.value)}
              placeholder="Paste any text here — FAQs, policies, service descriptions, staff info, pricing, promotions..."
              rows={6}
              className="w-full rounded-xl px-4 py-3 text-sm text-white resize-none"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(123,47,255,0.2)", outline: "none" }}
            />
            {addMsg && (
              <p className="text-xs font-semibold" style={{ color: addMsg.startsWith("✓") ? "#22c55e" : "#ff4d8d" }}>{addMsg}</p>
            )}
            <button
              type="submit"
              disabled={adding || !customText.trim()}
              className="btn-neon px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest disabled:opacity-50"
            >
              {adding ? "Teaching Hailey..." : "Teach Hailey →"}
            </button>
          </form>
        </div>

        {/* Knowledge chunks list */}
        <div className="glass rounded-2xl p-6 relative overflow-hidden" style={{ border: "1px solid rgba(0,212,255,0.15)" }}>
          <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: "linear-gradient(90deg, transparent, #00d4ff, transparent)" }} />
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-black text-white">Knowledge Chunks</h2>
            {websiteCount > 0 && (
              <button
                onClick={handleClearWebsite}
                className="text-xs font-bold px-3 py-1.5 rounded-lg transition-all"
                style={{ background: "rgba(255,0,110,0.08)", color: "#ff4d8d", border: "1px solid rgba(255,0,110,0.2)" }}
              >
                Clear website chunks
              </button>
            )}
          </div>

          {loading ? (
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>Loading...</p>
          ) : chunks.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-2xl mb-2">🧠</p>
              <p className="text-sm font-semibold" style={{ color: "rgba(255,255,255,0.3)" }}>No knowledge yet</p>
              <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.2)" }}>Sync your website in Settings or add custom text above</p>
            </div>
          ) : (
            <div className="space-y-3">
              {chunks.map(chunk => {
                const sc = sourceColor(chunk.source_type);
                return (
                  <div key={chunk.id} className="rounded-xl p-4 group" style={{ background: "rgba(0,0,0,0.25)", border: "1px solid rgba(255,255,255,0.05)" }}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <span className="text-xs font-black uppercase px-2 py-0.5 rounded-md" style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>
                          {chunk.source_type}
                        </span>
                        {chunk.source_label && (
                          <span className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>{chunk.source_label}</span>
                        )}
                      </div>
                      <button
                        onClick={() => handleDelete(chunk.id)}
                        disabled={deletingId === chunk.id}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-xs px-2 py-1 rounded-lg flex-shrink-0"
                        style={{ background: "rgba(255,0,110,0.08)", color: "#ff4d8d", border: "1px solid rgba(255,0,110,0.15)" }}
                      >
                        {deletingId === chunk.id ? "..." : "Remove"}
                      </button>
                    </div>
                    <p className="text-xs leading-relaxed line-clamp-3" style={{ color: "rgba(255,255,255,0.55)" }}>
                      {chunk.content}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
