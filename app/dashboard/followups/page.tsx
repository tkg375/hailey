import { requireAuth } from "@/lib/auth";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function FollowupsPage() {
  const session = await requireAuth();
  const db = await getDb();

  const sequences = await db.prepare(
    "SELECT * FROM followup_sequences WHERE business_id = ? ORDER BY created_at DESC"
  ).bind(session.businessId).all<any>();

  const triggerLabels: Record<string, string> = {
    post_visit: "After every appointment",
    no_show: "When client no-shows",
    reengagement: "When client goes quiet (60+ days)",
    birthday: "On client birthday",
  };

  return (
    <>
      <div className="mb-8">
        <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "rgba(0,212,255,0.5)" }}>// FOLLOW-UPS</p>
        <h1 className="text-2xl md:text-3xl font-black text-white">Follow-Up Sequences</h1>
        <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.35)" }}>Automated messages that go out after appointments or inactivity.</p>
      </div>

      {/* Default sequences */}
      <div className="space-y-4 mb-8">
        {Object.entries(triggerLabels).map(([trigger, label]) => {
          const seq = sequences.results.find((s: any) => s.trigger === trigger);
          return (
            <div key={trigger} className="glass rounded-2xl p-5 flex items-center justify-between" style={{ border: "1px solid rgba(0,212,255,0.1)" }}>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0" style={{ background: "rgba(0,212,255,0.08)" }}>
                  {trigger === "post_visit" ? "✅" : trigger === "no_show" ? "⚠️" : trigger === "reengagement" ? "💌" : "🎂"}
                </div>
                <div>
                  <div className="font-bold text-sm text-white">{label}</div>
                  <div className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>
                    {seq ? "Sequence configured" : "Not configured yet"}
                  </div>
                </div>
              </div>
              <span
                className="text-xs font-black uppercase px-3 py-1.5 rounded-lg flex-shrink-0"
                style={seq?.active
                  ? { background: "rgba(0,212,255,0.12)", color: "#00d4ff", border: "1px solid rgba(0,212,255,0.3)" }
                  : { background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.08)" }
                }
              >
                {seq?.active ? "Active" : "Inactive"}
              </span>
            </div>
          );
        })}
      </div>

      <div className="glass rounded-2xl p-8 text-center" style={{ border: "1px solid rgba(123,47,255,0.2)" }}>
        <div className="text-3xl mb-3">🚧</div>
        <p className="font-black text-white mb-2">Full editor coming soon</p>
        <p className="text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>You&apos;ll be able to customize message timing, content, and channels (email + SMS) here.</p>
      </div>
    </>
  );
}
