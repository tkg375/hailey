"use client";
import { useState } from "react";
import Link from "next/link";

export default function MobileNav() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="md:hidden flex flex-col gap-1.5 p-2"
        aria-label="Open menu"
      >
        <span className="block w-5 h-0.5" style={{ background: "#00d4ff" }} />
        <span className="block w-5 h-0.5" style={{ background: "#00d4ff" }} />
        <span className="block w-3 h-0.5" style={{ background: "#00d4ff" }} />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex flex-col" style={{ background: "rgba(4,8,15,0.97)", backdropFilter: "blur(20px)" }}>
          <div className="flex items-center justify-between px-6 py-5">
            <span className="text-xl font-black tracking-wider" style={{ color: "#00d4ff" }}>HAILEY</span>
            <button onClick={() => setOpen(false)} className="text-2xl" style={{ color: "rgba(255,255,255,0.5)" }}>✕</button>
          </div>
          <nav className="flex flex-col gap-2 px-6 mt-8">
            {[
              { href: "#how-it-works", label: "How It Works" },
              { href: "#pricing", label: "Pricing" },
              { href: "/login", label: "Sign In" },
            ].map(item => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="py-4 text-2xl font-black tracking-wide border-b"
                style={{ color: "rgba(255,255,255,0.6)", borderColor: "rgba(0,212,255,0.1)" }}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="px-6 mt-10">
            <Link href="/register" onClick={() => setOpen(false)} className="btn-neon block text-center py-4 rounded-xl font-black text-sm tracking-widest uppercase">
              Start Free Trial →
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
