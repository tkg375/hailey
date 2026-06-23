import { requireAuth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AppointmentsPage() {
  const session = await requireAuth();
  const db = await getDb();

  const today = new Date().toISOString().split("T")[0];

  const appointments = await db.prepare(`
    SELECT a.*, s.name as service_label
    FROM appointments a
    LEFT JOIN services s ON s.id = a.service_id
    WHERE a.business_id = ?
    ORDER BY a.date DESC, a.time DESC
    LIMIT 100
  `).bind(session.businessId).all<any>();

  function formatTime(t: string) {
    const [h, m] = t.split(":").map(Number);
    return `${h % 12 || 12}:${m.toString().padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
  }

  function formatDate(d: string) {
    return new Date(d + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  }

  const statusColor: Record<string, string> = {
    confirmed: "#00d4ff",
    completed: "#22c55e",
    cancelled: "#ff006e",
    no_show: "#f59e0b",
  };

  const upcoming = appointments.results.filter((a: any) => a.date >= today);
  const past = appointments.results.filter((a: any) => a.date < today);

  return (
    <>
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "rgba(0,212,255,0.5)" }}>// APPOINTMENTS</p>
          <h1 className="text-2xl md:text-3xl font-black text-white">Schedule</h1>
        </div>
        <Link href="/dashboard/appointments/new" className="btn-neon px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest">
          + New
        </Link>
      </div>

      {appointments.results.length === 0 ? (
        <div className="glass rounded-2xl p-16 text-center" style={{ border: "1px solid rgba(0,212,255,0.12)" }}>
          <div className="text-5xl mb-4">📅</div>
          <p className="font-black text-white text-lg mb-2">No appointments yet</p>
          <p className="text-sm mb-6" style={{ color: "rgba(255,255,255,0.35)" }}>Share your booking page or add one manually.</p>
          <Link href="/dashboard/appointments/new" className="btn-neon inline-block px-6 py-3 rounded-xl text-sm font-black uppercase tracking-widest">
            Book first appointment →
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {upcoming.length > 0 && (
            <div>
              <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: "rgba(0,212,255,0.5)" }}>Upcoming ({upcoming.length})</p>
              <div className="glass rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(0,212,255,0.12)" }}>
                {upcoming.map((a: any, i: number) => (
                  <div key={a.id} className="flex items-center justify-between px-5 py-4 hover:bg-white/5 transition-colors" style={{ borderBottom: i < upcoming.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center font-black text-white text-sm flex-shrink-0" style={{ background: "linear-gradient(135deg, #00d4ff, #7b2fff)" }}>
                        {a.client_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-sm text-white truncate">{a.client_name}</div>
                        <div className="text-xs truncate" style={{ color: "rgba(255,255,255,0.35)" }}>{a.service_name}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 flex-shrink-0 ml-4">
                      <div className="text-right hidden sm:block">
                        <div className="text-sm font-bold" style={{ color: "#00d4ff" }}>{formatDate(a.date)}</div>
                        <div className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>{formatTime(a.time)}</div>
                      </div>
                      <span className="text-xs font-black uppercase px-2 py-1 rounded-lg" style={{ background: `${statusColor[a.status] ?? "#888"}22`, color: statusColor[a.status] ?? "#888" }}>
                        {a.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {past.length > 0 && (
            <div>
              <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: "rgba(255,255,255,0.2)" }}>Past ({past.length})</p>
              <div className="glass rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
                {past.slice(0, 20).map((a: any, i: number) => (
                  <div key={a.id} className="flex items-center justify-between px-5 py-4 hover:bg-white/5 transition-colors" style={{ borderBottom: i < Math.min(past.length, 20) - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center font-black text-sm flex-shrink-0" style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.4)" }}>
                        {a.client_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-sm truncate" style={{ color: "rgba(255,255,255,0.5)" }}>{a.client_name}</div>
                        <div className="text-xs truncate" style={{ color: "rgba(255,255,255,0.25)" }}>{a.service_name}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 flex-shrink-0 ml-4">
                      <div className="text-right hidden sm:block">
                        <div className="text-sm font-bold" style={{ color: "rgba(255,255,255,0.3)" }}>{formatDate(a.date)}</div>
                        <div className="text-xs" style={{ color: "rgba(255,255,255,0.2)" }}>{formatTime(a.time)}</div>
                      </div>
                      <span className="text-xs font-black uppercase px-2 py-1 rounded-lg" style={{ background: `${statusColor[a.status] ?? "#888"}18`, color: statusColor[a.status] ? `${statusColor[a.status]}99` : "#888" }}>
                        {a.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
