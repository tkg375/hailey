import { requireAuth } from "@/lib/auth";
import Link from "next/link";
import LogoutButton from "./LogoutButton";
import MobileDashNav from "./MobileDashNav";

const navItems = [
  { href: "/dashboard", label: "Home", icon: "⌂" },
  { href: "/dashboard/appointments", label: "Appointments", icon: "📅" },
  { href: "/dashboard/clients", label: "Clients", icon: "👥" },
  { href: "/dashboard/services", label: "Services", icon: "✦" },
  { href: "/dashboard/followups", label: "Follow-Ups", icon: "🔁" },
  { href: "/dashboard/knowledge", label: "Knowledge", icon: "🧠" },
  { href: "/dashboard/widget", label: "Chat Widget", icon: "💬" },
  { href: "/dashboard/settings", label: "Settings", icon: "⚙" },
];

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
              <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-black flex-shrink-0" style={{ background: "linear-gradient(135deg, #00d4ff, #7b2fff)" }}>H</div>
              <div className="absolute inset-0 rounded-lg blur-sm opacity-60" style={{ background: "linear-gradient(135deg, #00d4ff, #7b2fff)" }} />
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
        <nav className="flex-1 px-3 py-2 space-y-0.5">
          {navItems.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all hover:bg-white/5 group"
              style={{ color: "rgba(255,255,255,0.5)" }}
            >
              <span className="w-5 text-center text-base">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

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
