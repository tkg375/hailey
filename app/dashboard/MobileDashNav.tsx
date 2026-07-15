"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/dashboard", label: "Home", icon: "⌂" },
  { href: "/dashboard/appointments", label: "Appts", icon: "📅" },
  { href: "/dashboard/clients", label: "Clients", icon: "👥" },
  { href: "/dashboard/services", label: "Services", icon: "✦" },
  { href: "/dashboard/followups", label: "Follow-Ups", icon: "🔁" },
  { href: "/dashboard/knowledge", label: "Knowledge", icon: "🧠" },
  { href: "/dashboard/widget", label: "Widget", icon: "💬" },
  { href: "/dashboard/settings", label: "Settings", icon: "⚙" },
];

export default function MobileDashNav() {
  const path = usePathname();
  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-50 flex overflow-x-auto"
      style={{ background: "#080e1a", borderTop: "1px solid rgba(0,212,255,0.15)" }}
    >
      {navItems.map(item => {
        const active = path === item.href || (item.href !== "/dashboard" && path.startsWith(item.href));
        return (
          <Link
            key={item.href}
            href={item.href}
            className="flex-1 flex flex-col items-center gap-0.5 py-2.5 text-xs font-semibold transition-colors flex-shrink-0"
            style={{ color: active ? "#00d4ff" : "rgba(255,255,255,0.3)", minWidth: 64 }}
          >
            <span className="text-base leading-none">{item.icon}</span>
            <span className="text-[10px] whitespace-nowrap">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
