import { requireAuth } from "@/lib/auth";
import LogoutButton from "./LogoutButton";
import MobileDashNav from "./MobileDashNav";
import DashboardNav from "./DashboardNav";
import HaileyMark from "../HaileyMark";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAuth();

  return (
    <div className="min-h-screen flex" style={{ background: "#04080f" }}>
      <MobileDashNav />

      {/* Sidebar — desktop only */}
      <aside
        className="hidden lg:flex w-60 min-h-screen flex-col flex-shrink-0"
        style={{ background: "rgba(255,255,255,0.03)", borderRight: "1px solid rgba(0,212,255,0.1)" }}
      >
        {/* Logo */}
        <div className="px-5 py-5" style={{ borderBottom: "1px solid rgba(0,212,255,0.08)" }}>
          <div className="flex items-center gap-2 mb-1">
            <div className="relative">
              <div className="absolute inset-0 blur-sm opacity-50" style={{ background: "linear-gradient(135deg, #00d4ff, #7b2fff)" }} />
              <HaileyMark size={28} />
            </div>
            <span className="font-black text-lg tracking-wider" style={{ color: "#00d4ff" }}>HAILEY</span>
          </div>
          <p className="text-xs font-semibold truncate pl-9" style={{ color: "rgba(255,255,255,0.3)" }}>{session.businessName}</p>
        </div>

        {/* Status */}
        <div className="mx-4 my-3 px-3 py-2.5 rounded-xl text-xs flex items-center gap-2" style={{ background: "rgba(0,212,255,0.06)", border: "1px solid rgba(0,212,255,0.12)" }}>
          <span className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0 animate-pulse" />
          <span style={{ color: "rgba(0,212,255,0.8)" }}><strong>Hailey is online</strong></span>
        </div>

        {/* Nav */}
        <DashboardNav />

        <div className="p-4" style={{ borderTop: "1px solid rgba(0,212,255,0.08)" }}>
          <LogoutButton />
        </div>
      </aside>

      {/* Page content */}
      <main className="flex-1 min-w-0 p-4 md:p-8 pb-24 lg:pb-8 overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}
