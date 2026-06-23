import { requireAuth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await requireAuth();
  const db = await getDb();

  const today = new Date().toISOString().split("T")[0];
  const hour = new Date().getUTCHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const owner = await db.prepare("SELECT name FROM owners WHERE id = ?").bind(session.ownerId).first<{ name: string }>();
  const ownerFirstName = owner?.name?.split(" ")[0] ?? session.email.split("@")[0];

  const [todayAppts, totalClients, upcomingAppts, recentConvos] = await Promise.all([
    db.prepare("SELECT COUNT(*) as count FROM appointments WHERE business_id = ? AND date = ? AND status = 'confirmed'")
      .bind(session.businessId, today).first<{ count: number }>(),
    db.prepare("SELECT COUNT(*) as count FROM clients WHERE business_id = ?")
      .bind(session.businessId).first<{ count: number }>(),
    db.prepare(`SELECT a.*, s.name as service_label FROM appointments a
      LEFT JOIN services s ON s.id = a.service_id
      WHERE a.business_id = ? AND a.date >= ? AND a.status = 'confirmed'
      ORDER BY a.date ASC, a.time ASC LIMIT 8`)
      .bind(session.businessId, today).all<any>(),
    db.prepare("SELECT COUNT(*) as count FROM conversations WHERE business_id = ? AND updated_at >= datetime('now', '-7 days')")
      .bind(session.businessId).first<{ count: number }>(),
  ]);

  function formatTime(t: string) {
    const [h, m] = t.split(":").map(Number);
    return `${h % 12 || 12}:${m.toString().padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
  }

  function formatDate(d: string) {
    const date = new Date(d + "T00:00:00");
    const todayDate = new Date(today + "T00:00:00");
    const diff = Math.round((date.getTime() - todayDate.getTime()) / 86400000);
    if (diff === 0) return "Today";
    if (diff === 1) return "Tomorrow";
    return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  }

  const stats = [
    { label: "Today", value: todayAppts?.count ?? 0, sub: "appointments", accent: "#00d4ff" },
    { label: "Total clients", value: totalClients?.count ?? 0, sub: "in your CRM", accent: "#7b2fff" },
    { label: "Chats this week", value: recentConvos?.count ?? 0, sub: "from Hailey", accent: "#ff006e" },
  ];

  return (
    <>
      {/* Mobile top bar */}
      <div className="lg:hidden flex items-center justify-between mb-6 pb-4" style={{ borderBottom: "1px solid rgba(0,212,255,0.1)" }}>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-black" style={{ background: "linear-gradient(135deg, #00d4ff, #7b2fff)" }}>H</div>
          <span className="font-black text-sm truncate max-w-[180px]" style={{ color: "#00d4ff" }}>{session.businessName}</span>
        </div>
        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
      </div>

      {/* Header */}
      <div className="mb-8">
        <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "rgba(0,212,255,0.5)" }}>// DASHBOARD</p>
        <h1 className="text-2xl md:text-3xl font-black text-white">
          {greeting}, <span style={{ color: "#00d4ff" }}>{ownerFirstName}</span>
        </h1>
        <p className="mt-1 text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>
          Here&apos;s what&apos;s happening at <strong style={{ color: "rgba(255,255,255,0.6)" }}>{session.businessName}</strong> today.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {stats.map(s => (
          <div key={s.label} className="glass rounded-2xl p-6 relative overflow-hidden" style={{ border: `1px solid ${s.accent}22` }}>
            <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: `linear-gradient(90deg, transparent, ${s.accent}, transparent)` }} />
            <div className="text-4xl font-black mb-1" style={{ color: s.accent }}>{s.value}</div>
            <div className="text-sm font-bold text-white">{s.label}</div>
            <div className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.25)" }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Upcoming appointments */}
      <div className="glass rounded-2xl overflow-hidden mb-6" style={{ border: "1px solid rgba(0,212,255,0.12)" }}>
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid rgba(0,212,255,0.08)" }}>
          <h2 className="font-black text-white tracking-wide">Upcoming Appointments</h2>
          <Link href="/dashboard/appointments" className="text-xs font-bold uppercase tracking-widest hover:text-white transition-colors" style={{ color: "#00d4ff" }}>View all →</Link>
        </div>
        {upcomingAppts.results.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <div className="text-4xl mb-3">📭</div>
            <p className="font-bold text-white mb-1">No upcoming appointments yet</p>
            <p className="text-sm mb-6" style={{ color: "rgba(255,255,255,0.35)" }}>Share your booking link and Hailey will start filling your calendar.</p>
            <Link
              href={`/book/${session.businessId}`}
              target="_blank"
              className="btn-neon inline-block text-sm font-black px-5 py-2.5 rounded-xl uppercase tracking-widest"
            >
              View booking page →
            </Link>
          </div>
        ) : (
          <div>
            {upcomingAppts.results.map((appt: any) => (
              <div key={appt.id} className="flex items-center justify-between px-6 py-4 transition-colors hover:bg-white/5" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                <div className="flex items-center gap-4">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-black text-white flex-shrink-0" style={{ background: "linear-gradient(135deg, #00d4ff, #7b2fff)" }}>
                    {appt.client_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-bold text-sm text-white">{appt.client_name}</div>
                    <div className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>{appt.service_name}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold" style={{ color: "#00d4ff" }}>{formatDate(appt.date)}</div>
                  <div className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>{formatTime(appt.time)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { href: "/dashboard/appointments/new", icon: "＋", label: "New Appointment", sub: "Book manually", accent: "#00d4ff" },
          { href: `/book/${session.businessId}`, icon: "🔗", label: "Booking Page", sub: "Preview client view", accent: "#7b2fff", target: "_blank" },
          { href: `/chat/${session.businessId}`, icon: "💬", label: "Test Hailey", sub: "Try the chat widget", accent: "#ff006e", target: "_blank" },
        ].map(a => (
          <Link
            key={a.href}
            href={a.href}
            target={(a as any).target}
            className="glass rounded-2xl p-5 flex items-center gap-4 transition-all hover:bg-white/5 group"
            style={{ border: `1px solid ${a.accent}18` }}
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0 font-black" style={{ background: `${a.accent}18`, color: a.accent }}>{a.icon}</div>
            <div>
              <div className="font-bold text-sm text-white">{a.label}</div>
              <div className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>{a.sub}</div>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
