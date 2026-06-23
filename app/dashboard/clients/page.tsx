import { requireAuth } from "@/lib/auth";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const session = await requireAuth();
  const db = await getDb();

  const clients = await db.prepare(`
    SELECT c.*, COUNT(a.id) as appt_count
    FROM clients c
    LEFT JOIN appointments a ON a.client_id = c.id
    WHERE c.business_id = ?
    GROUP BY c.id
    ORDER BY c.created_at DESC
    LIMIT 200
  `).bind(session.businessId).all<any>();

  return (
    <>
      <div className="mb-8">
        <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "rgba(0,212,255,0.5)" }}>// CLIENTS</p>
        <h1 className="text-2xl md:text-3xl font-black text-white">Client CRM</h1>
        <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.35)" }}>{clients.results.length} clients</p>
      </div>

      {clients.results.length === 0 ? (
        <div className="glass rounded-2xl p-16 text-center" style={{ border: "1px solid rgba(0,212,255,0.12)" }}>
          <div className="text-5xl mb-4">👥</div>
          <p className="font-black text-white text-lg mb-2">No clients yet</p>
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>Clients are added automatically when Hailey books an appointment.</p>
        </div>
      ) : (
        <div className="glass rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(0,212,255,0.12)" }}>
          {clients.results.map((c: any, i: number) => (
            <div
              key={c.id}
              className="flex items-center justify-between px-5 py-4 hover:bg-white/5 transition-colors"
              style={{ borderBottom: i < clients.results.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-9 h-9 rounded-full flex items-center justify-center font-black text-white text-sm flex-shrink-0" style={{ background: "linear-gradient(135deg, #00d4ff, #7b2fff)" }}>
                  {c.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-sm text-white truncate">{c.name}</div>
                  <div className="text-xs truncate" style={{ color: "rgba(255,255,255,0.35)" }}>
                    {c.email ?? c.phone ?? "No contact info"}
                  </div>
                </div>
              </div>
              <div className="flex-shrink-0 ml-4 text-right">
                <div className="text-xs font-black" style={{ color: "#00d4ff" }}>{c.appt_count} appt{c.appt_count !== 1 ? "s" : ""}</div>
                {c.last_visit_at && (
                  <div className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.25)" }}>
                    Last: {new Date(c.last_visit_at).toLocaleDateString()}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
