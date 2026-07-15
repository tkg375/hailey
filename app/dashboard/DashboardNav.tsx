"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export const navItems = [
  { href: "/dashboard", label: "Home", icon: "⌂" },
  { href: "/dashboard/appointments", label: "Appointments", icon: "📅" },
  { href: "/dashboard/clients", label: "Clients", icon: "👥" },
  { href: "/dashboard/services", label: "Services", icon: "✦" },
  { href: "/dashboard/followups", label: "Follow-Ups", icon: "🔁" },
  { href: "/dashboard/knowledge", label: "Knowledge", icon: "🧠" },
  { href: "/dashboard/widget", label: "Chat Widget", icon: "💬" },
  { href: "/dashboard/settings", label: "Settings", icon: "⚙" },
];

export default function DashboardNav() {
  const path = usePathname();
  return (
    <nav className="flex-1 px-3 py-2 space-y-0.5">
      {navItems.map(item => {
        const active = path === item.href || (item.href !== "/dashboard" && path.startsWith(item.href));
        return (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all group"
            style={active
              ? { color: "#00d4ff", background: "rgba(0,212,255,0.1)", border: "1px solid rgba(0,212,255,0.25)" }
              : { color: "rgba(255,255,255,0.5)", border: "1px solid transparent" }
            }
          >
            <span className="w-5 text-center text-base flex-shrink-0">{item.icon}</span>
            {item.label}
            {active && <span className="ml-auto w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "#00d4ff" }} />}
          </Link>
        );
      })}
    </nav>
  );
}
