"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import HaileyMark from "../HaileyMark";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json() as any;
    if (!res.ok) {
      setError(data.error || "Login failed");
      setLoading(false);
      return;
    }
    router.push("/dashboard");
  }

  return (
    <div className="min-h-screen grid-bg flex items-center justify-center px-4 py-10 relative overflow-hidden" style={{ background: "#04080f" }}>
      {/* Orbs */}
      <div className="orb" style={{ width: 500, height: 500, top: -150, left: -200, background: "radial-gradient(circle, rgba(123,47,255,0.25), transparent 70%)" }} />
      <div className="orb" style={{ width: 400, height: 400, bottom: -100, right: -100, background: "radial-gradient(circle, rgba(0,212,255,0.2), transparent 70%)", animationDelay: "-5s" }} />

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-10">
          <Link href="/" className="inline-flex items-center gap-3 justify-center mb-4">
            <div className="relative">
              <div className="absolute inset-0 blur-lg opacity-50" style={{ background: "linear-gradient(135deg, #00d4ff, #7b2fff)" }} />
              <HaileyMark size={40} />
            </div>
            <span className="text-2xl font-black tracking-widest glow-cyan" style={{ color: "#00d4ff" }}>HAILEY</span>
          </Link>
          <p className="text-sm font-semibold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.3)" }}>Welcome back</p>
        </div>

        {/* Card */}
        <div className="glass rounded-2xl p-8 relative overflow-hidden" style={{ border: "1px solid rgba(0,212,255,0.2)", boxShadow: "0 0 60px rgba(0,212,255,0.06), 0 0 120px rgba(123,47,255,0.06)" }}>
          {/* Top accent line */}
          <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: "linear-gradient(90deg, transparent, #00d4ff, #7b2fff, transparent)" }} />

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="px-4 py-3 rounded-xl text-sm font-semibold" style={{ background: "rgba(255,0,110,0.12)", border: "1px solid rgba(255,0,110,0.3)", color: "#ff4d8d" }}>
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-black uppercase tracking-widest mb-2" style={{ color: "rgba(0,212,255,0.7)" }}>Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="neon-input w-full rounded-xl px-4 py-3.5 text-sm text-white"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(0,212,255,0.2)", outline: "none" }}
                placeholder="you@yourbusiness.com"
              />
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-widest mb-2" style={{ color: "rgba(0,212,255,0.7)" }}>Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="neon-input w-full rounded-xl px-4 py-3.5 text-sm text-white"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(0,212,255,0.2)", outline: "none" }}
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-neon w-full py-4 rounded-xl font-black text-sm tracking-widest uppercase disabled:opacity-50 mt-2"
            >
              {loading ? "Authenticating..." : "Sign In →"}
            </button>
          </form>

          <p className="text-center text-sm mt-6" style={{ color: "rgba(255,255,255,0.3)" }}>
            No account?{" "}
            <Link href="/register" className="font-black hover:underline" style={{ color: "#00d4ff" }}>Start free trial</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
