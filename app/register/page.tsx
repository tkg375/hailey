import Link from "next/link";

export default function RegisterPage() {
  return (
    <div className="min-h-screen grid-bg flex items-center justify-center px-4 relative overflow-hidden" style={{ background: "#04080f" }}>
      <div className="orb" style={{ width: 500, height: 500, top: -100, right: -200, background: "radial-gradient(circle, rgba(123,47,255,0.2), transparent 70%)" }} />
      <div className="orb" style={{ width: 400, height: 400, bottom: -100, left: -100, background: "radial-gradient(circle, rgba(0,212,255,0.18), transparent 70%)", animationDelay: "-6s" }} />

      <div className="relative z-10 text-center max-w-md">
        <Link href="/" className="inline-flex items-center gap-3 justify-center mb-10">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-lg" style={{ background: "linear-gradient(135deg, #00d4ff, #7b2fff)" }}>H</div>
            <div className="absolute inset-0 rounded-xl blur-lg opacity-60" style={{ background: "linear-gradient(135deg, #00d4ff, #7b2fff)" }} />
          </div>
          <span className="text-2xl font-black tracking-widest glow-cyan" style={{ color: "#00d4ff" }}>HAILEY</span>
        </Link>

        <div className="glass rounded-2xl p-10 relative overflow-hidden" style={{ border: "1px solid rgba(0,212,255,0.2)", boxShadow: "0 0 60px rgba(0,212,255,0.06), 0 0 120px rgba(123,47,255,0.06)" }}>
          <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: "linear-gradient(90deg, transparent, #00d4ff, #7b2fff, #ff006e, transparent)" }} />

          <div className="text-5xl mb-6">🚀</div>
          <h1 className="text-2xl font-black tracking-widest mb-3" style={{ color: "#00d4ff" }}>COMING SOON</h1>
          <p className="text-sm leading-relaxed mb-8" style={{ color: "rgba(255,255,255,0.4)" }}>
            Hailey is currently in private beta. New accounts are not available yet — check back soon.
          </p>

          <Link href="/login" className="btn-neon inline-block px-8 py-3 rounded-xl font-black text-sm tracking-widest uppercase">
            Sign In →
          </Link>
        </div>
      </div>
    </div>
  );
}
