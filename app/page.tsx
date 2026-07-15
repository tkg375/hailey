import Link from "next/link";
import MobileNav from "./MobileNav";

const mockChat = [
  { role: "visitor", text: "Hi! Do you have anything open this Saturday for a blowout?" },
  { role: "hailey", text: "Hey there! 👋 We have openings at 10am, 1pm, and 3:30pm on Saturday. Any of those work for you?" },
  { role: "visitor", text: "1pm is perfect!" },
  { role: "hailey", text: "Love it! Can I grab your name and a phone number to lock that in? 😊" },
  { role: "visitor", text: "Sarah Johnson, (555) 208-4411" },
  { role: "hailey", text: "You're all set, Sarah! See you Saturday at 1pm. I'll send a reminder the morning of. ✨" },
];

export default function HomePage() {
  return (
    <div className="min-h-screen grid-bg relative overflow-x-hidden" style={{ background: "#04080f" }}>
      {/* Background orbs */}
      <div className="orb" style={{ width: 600, height: 600, top: -100, left: -200, background: "radial-gradient(circle, rgba(123,47,255,0.25), transparent 70%)" }} />
      <div className="orb" style={{ width: 500, height: 500, top: 200, right: -150, background: "radial-gradient(circle, rgba(0,212,255,0.2), transparent 70%)", animationDelay: "-4s" }} />
      <div className="orb" style={{ width: 400, height: 400, bottom: 100, left: "40%", background: "radial-gradient(circle, rgba(255,0,110,0.15), transparent 70%)", animationDelay: "-8s" }} />

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-5 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-sm font-black" style={{ background: "linear-gradient(135deg, #00d4ff, #7b2fff)" }}>H</div>
            <div className="absolute inset-0 rounded-lg blur-md opacity-60" style={{ background: "linear-gradient(135deg, #00d4ff, #7b2fff)" }} />
          </div>
          <span className="text-xl font-black tracking-wider" style={{ color: "#00d4ff" }}>HAILEY</span>
        </div>
        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-6">
          <Link href="#how-it-works" className="text-xs font-semibold tracking-widest uppercase hover:text-cyan-400 transition-colors" style={{ color: "rgba(255,255,255,0.5)" }}>How it works</Link>
          <Link href="#pricing" className="text-xs font-semibold tracking-widest uppercase hover:text-cyan-400 transition-colors" style={{ color: "rgba(255,255,255,0.5)" }}>Pricing</Link>
          <Link href="/login" className="text-xs font-semibold tracking-widest uppercase hover:text-cyan-400 transition-colors" style={{ color: "rgba(255,255,255,0.5)" }}>Sign in</Link>
          <Link href="/register" className="btn-neon px-5 py-2.5 rounded-lg text-xs font-black tracking-widest uppercase">
            Start Free
          </Link>
        </div>
        {/* Mobile nav */}
        <MobileNav />
      </nav>

      {/* Hero */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pt-10 pb-16 md:pt-16 md:pb-24">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          {/* Left */}
          <div>
            {/* Status badge */}
            <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full mb-8 glass text-xs font-semibold tracking-widest uppercase" style={{ color: "#00d4ff" }}>
              <span className="relative flex h-2 w-2">
                <span className="pulse-ring absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400" />
              </span>
              Live on 50+ business websites
            </div>

            <h1 className="font-black leading-none mb-6" style={{ fontSize: "clamp(3rem, 6vw, 5.5rem)" }}>
              <span className="block text-white">SHE</span>
              <span className="block text-white">ANSWERS.</span>
              <span className="block text-white">SHE BOOKS.</span>
              <span className="block glow-cyan" style={{ color: "#00d4ff" }}>SHE FOLLOWS UP.</span>
            </h1>

            <p className="text-base leading-relaxed mb-10 max-w-md" style={{ color: "rgba(255,255,255,0.5)" }}>
              Hailey is an AI receptionist that lives on your website. She chats with clients, books appointments, and sends follow-ups — without you lifting a finger.
            </p>

            <div className="flex flex-wrap items-center gap-4">
              <Link href="/register" className="btn-neon px-8 py-4 rounded-xl text-sm font-black tracking-widest uppercase shadow-2xl">
                Start 30-Day Free Trial →
              </Link>
              <Link href="#how-it-works" className="text-xs font-semibold tracking-widest uppercase transition-colors hover:text-cyan-400" style={{ color: "rgba(255,255,255,0.4)" }}>
                See how it works ↓
              </Link>
            </div>
            <p className="text-xs mt-4" style={{ color: "rgba(255,255,255,0.25)" }}>No credit card required · Set up in under 10 minutes</p>

            {/* Stats row */}
            <div className="flex gap-6 md:gap-8 mt-10 md:mt-12">
              {[
                { n: "50+", label: "Business clients" },
                { n: "4.9★", label: "Avg. client rating" },
                { n: "98%", label: "Response rate" },
                { n: "24/7", label: "Always online" },
              ].map(s => (
                <div key={s.n}>
                  <div className="text-2xl font-black glow-cyan" style={{ color: "#00d4ff" }}>{s.n}</div>
                  <div className="text-xs uppercase tracking-wider mt-1" style={{ color: "rgba(255,255,255,0.35)" }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right — mock chat (hidden on mobile) */}
          <div className="relative hidden lg:block">
            <div>
            {/* Decorative corner brackets */}
            <div className="absolute -inset-3 corner-tl corner-br pointer-events-none" />

            <div className="glass rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(0,212,255,0.2)", boxShadow: "0 0 60px rgba(0,212,255,0.08), 0 0 120px rgba(123,47,255,0.06)" }}>
              {/* Chat header */}
              <div className="px-5 py-4 flex items-center gap-3" style={{ background: "linear-gradient(135deg, rgba(0,212,255,0.15), rgba(123,47,255,0.15))", borderBottom: "1px solid rgba(0,212,255,0.15)" }}>
                <div className="relative">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-black text-sm" style={{ background: "linear-gradient(135deg, #00d4ff, #7b2fff)" }}>H</div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 bg-green-400" style={{ borderColor: "#04080f" }} />
                </div>
                <div>
                  <div className="font-black text-sm tracking-wider" style={{ color: "#00d4ff" }}>HAILEY</div>
                  <div className="text-xs" style={{ color: "rgba(0,212,255,0.5)" }}>AI Receptionist · Online now</div>
                </div>
                <div className="ml-auto flex gap-1">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="w-2 h-2 rounded-full" style={{ background: i === 0 ? "#ff5f57" : i === 1 ? "#ffbd2e" : "#28ca41" }} />
                  ))}
                </div>
              </div>

              {/* Messages */}
              <div className="p-5 space-y-3" style={{ background: "rgba(4,8,15,0.6)" }}>
                {mockChat.map((m, i) => (
                  <div key={i} className={`flex ${m.role === "visitor" ? "justify-end" : "justify-start"}`}>
                    {m.role === "hailey" && (
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-black mr-2 flex-shrink-0 mt-0.5" style={{ background: "linear-gradient(135deg, #00d4ff, #7b2fff)" }}>H</div>
                    )}
                    <div
                      className="max-w-[78%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed"
                      style={m.role === "visitor"
                        ? { background: "linear-gradient(135deg, rgba(0,212,255,0.25), rgba(123,47,255,0.25))", border: "1px solid rgba(0,212,255,0.3)", color: "#e2e8f0", borderBottomRightRadius: 4 }
                        : { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.8)", borderBottomLeftRadius: 4 }
                      }
                    >
                      {m.text}
                    </div>
                  </div>
                ))}
              </div>

              {/* Fake input */}
              <div className="px-5 pb-5" style={{ background: "rgba(4,8,15,0.6)" }}>
                <div className="flex gap-2 px-4 py-3 rounded-xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(0,212,255,0.12)" }}>
                  <span className="text-sm flex-1" style={{ color: "rgba(255,255,255,0.2)" }}>Message Hailey...</span>
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, #00d4ff, #7b2fff)" }}>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" className="w-3.5 h-3.5">
                      <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
            </div>
          </div>
        </div>
      </section>

      {/* Businesses ticker */}
      <section className="relative z-10 py-8" style={{ borderTop: "1px solid rgba(0,212,255,0.1)", borderBottom: "1px solid rgba(0,212,255,0.1)", background: "rgba(0,212,255,0.03)" }}>
        <div className="max-w-5xl mx-auto px-6">
          <p className="text-center text-xs font-bold uppercase tracking-widest mb-5" style={{ color: "rgba(0,212,255,0.5)" }}>Hailey works for any local service business</p>
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-3">
            {["✂️ Salons", "🐾 Pet Groomers", "💆 Spas & Massage", "🚗 Auto Detailers", "💪 Personal Trainers", "💈 Barbershops", "💅 Nail Studios"].map(v => (
              <span key={v} className="text-sm font-semibold tracking-wide" style={{ color: "rgba(255,255,255,0.4)" }}>{v}</span>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="relative z-10 max-w-6xl mx-auto px-6 py-28">
        <div className="text-center mb-16">
          <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: "#00d4ff" }}>// 01 — HOW IT WORKS</p>
          <h2 className="text-5xl font-black text-white mb-4">WHAT HAILEY<br />
            <span className="glow-cyan" style={{ color: "#00d4ff" }}>DOES ALL DAY</span>
          </h2>
          <p style={{ color: "rgba(255,255,255,0.4)" }}>While you're busy doing the actual work, Hailey handles the front desk.</p>
        </div>
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
          {[
            {
              num: "01",
              icon: "💬",
              title: "Chats with clients",
              desc: "Hailey answers questions about pricing, services, and availability — instantly, day or night. No hold music. No missed calls.",
              accent: "#00d4ff",
            },
            {
              num: "02",
              icon: "📅",
              title: "Books appointments",
              desc: "When a client is ready, Hailey walks them through booking in seconds and confirms it right in the chat. Your calendar fills itself.",
              accent: "#7b2fff",
            },
            {
              num: "03",
              icon: "🔁",
              title: "Brings them back",
              desc: "Post-visit check-ins, \"we miss you\" messages, and rebooking reminders go out automatically. Your regulars stay regular.",
              accent: "#ff006e",
            },
          ].map(item => (
            <div key={item.num} className="glass rounded-2xl p-8 relative overflow-hidden group hover:border-opacity-40 transition-all" style={{ borderColor: `${item.accent}22` }}>
              {/* Accent top bar */}
              <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: `linear-gradient(90deg, transparent, ${item.accent}, transparent)` }} />
              <div className="text-xs font-black tracking-widest mb-6" style={{ color: `${item.accent}80` }}>{item.num}</div>
              <div className="text-3xl mb-5">{item.icon}</div>
              <h3 className="text-lg font-black uppercase tracking-wide text-white mb-3">{item.title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.45)" }}>{item.desc}</p>
              {/* Hover glow */}
              <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" style={{ boxShadow: `inset 0 0 40px ${item.accent}08` }} />
            </div>
          ))}
        </div>
      </section>

      {/* Setup steps */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 py-28">
        <div className="text-center mb-16">
          <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: "#7b2fff" }}>// 02 — SETUP</p>
          <h2 className="text-5xl font-black text-white mb-4">LIVE IN UNDER<br />
            <span className="glow-cyan" style={{ color: "#7b2fff", textShadow: "0 0 20px rgba(123,47,255,0.6)" }}>10 MINUTES</span>
          </h2>
          <p style={{ color: "rgba(255,255,255,0.4)" }}>No developer. No setup call. Just three steps.</p>
        </div>
        <div className="grid sm:grid-cols-3 gap-6">
          {[
            { num: "01", title: "Connect your site", desc: "Paste one line of code into your website, or let us do it for you. Takes under a minute." },
            { num: "02", title: "Teach her your business", desc: "Add your services, hours, and pricing. Hailey learns your voice and what to say." },
            { num: "03", title: "Go live", desc: "Hailey starts chatting with visitors immediately — answering questions and booking appointments." },
          ].map((s, i) => (
            <div key={s.num} className="glass rounded-2xl p-8 relative" style={{ borderColor: "rgba(0,212,255,0.15)" }}>
              <div className="text-xs font-black tracking-widest mb-6" style={{ color: "rgba(0,212,255,0.5)" }}>{s.num}</div>
              <h3 className="text-lg font-black uppercase tracking-wide text-white mb-3">{s.title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.45)" }}>{s.desc}</p>
              {i < 2 && (
                <div className="hidden sm:block absolute top-1/2 -right-3 text-2xl" style={{ color: "rgba(0,212,255,0.3)" }}>→</div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="relative z-10 py-20" style={{ borderTop: "1px solid rgba(0,212,255,0.08)", borderBottom: "1px solid rgba(0,212,255,0.08)" }}>
        <div className="absolute inset-0 orb" style={{ width: "100%", height: "100%", background: "radial-gradient(ellipse at center, rgba(123,47,255,0.12), transparent 70%)", filter: "none", animation: "none", borderRadius: 0 }} />
        <div className="relative max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: "#00d4ff" }}>// LOVED BY BUSINESS OWNERS</p>
            <h2 className="text-4xl font-black text-white">4.9★ average across 50+ businesses</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                quote: "I used to spend 2 hours a day answering the same questions over text. Hailey handles all of it now. My clients actually think she's a real person.",
                name: "Chelsea R.",
                role: "Pet groomer, Atlanta GA",
              },
              {
                quote: "Booked $3,200 in appointments the first week she was live — most of it after hours when I would've just missed those messages entirely.",
                name: "Marcus T.",
                role: "Barbershop owner, Dallas TX",
              },
              {
                quote: "The follow-up messages alone paid for the subscription. Clients who ghosted are actually rebooking now.",
                name: "Priya N.",
                role: "Day spa owner, San Diego CA",
              },
            ].map((t) => (
              <div key={t.name} className="glass rounded-2xl p-7 flex flex-col" style={{ borderColor: "rgba(0,212,255,0.15)" }}>
                <div className="text-sm mb-4" style={{ color: "#ffbd2e" }}>★★★★★</div>
                <blockquote className="text-sm leading-relaxed mb-6 flex-1" style={{ color: "rgba(255,255,255,0.7)" }}>
                  &ldquo;{t.quote}&rdquo;
                </blockquote>
                <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "#00d4ff" }}>{t.name} — {t.role}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="relative z-10 max-w-3xl mx-auto px-6 py-28">
        <div className="text-center mb-14">
          <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: "#00d4ff" }}>// FAQ</p>
          <h2 className="text-4xl font-black text-white">Questions, answered</h2>
        </div>
        <div className="space-y-4">
          {[
            {
              q: "What if Hailey doesn't know the answer to something?",
              a: "She'll say so honestly and offer to have you follow up directly — she never makes up information about your business.",
            },
            {
              q: "Can I control what she says?",
              a: "Yes. You set her tone, the services and pricing she quotes, and what she's allowed to book automatically versus flag for you.",
            },
            {
              q: "What happens after the 30-day free trial?",
              a: "You choose a plan and keep going — no auto-charge, no surprise bills. Cancel anytime with one click from your dashboard.",
            },
            {
              q: "Does this work with my existing calendar or booking system?",
              a: "Hailey has her own built-in booking and client CRM. If you need a specific calendar integration, reach out — we're adding more every month.",
            },
            {
              q: "Is my client data secure?",
              a: "All data is encrypted in transit and at rest. You own your client data and can export or delete it at any time.",
            },
          ].map((item) => (
            <details key={item.q} className="glass rounded-xl px-6 py-4 group" style={{ borderColor: "rgba(0,212,255,0.15)" }}>
              <summary className="cursor-pointer list-none flex items-center justify-between gap-4 font-semibold text-sm text-white">
                {item.q}
                <span className="flex-shrink-0 text-lg transition-transform group-open:rotate-45" style={{ color: "#00d4ff" }}>+</span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.5)" }}>{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="relative z-10 py-28">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: "#00d4ff" }}>// 02 — PRICING</p>
            <h2 className="text-5xl font-black text-white mb-4">PLANS THAT<br />
              <span className="glow-magenta" style={{ color: "#ff006e" }}>MAKE SENSE</span>
            </h2>
            <p style={{ color: "rgba(255,255,255,0.4)" }}>Flat monthly rate. Cancel anytime. No surprises.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                name: "STARTER",
                price: "$79",
                tagline: "Get your booking page live",
                popular: false,
                accent: "rgba(0,212,255,0.5)",
                features: ["Online booking page", "Appointment reminders", "Client CRM", "Email support"],
              },
              {
                name: "PRO",
                price: "$149",
                tagline: "Let Hailey run the front desk",
                popular: true,
                accent: "#7b2fff",
                features: ["Everything in Starter", "AI chat widget", "Follow-up sequences", "Post-visit review requests", "Priority support"],
              },
              {
                name: "GROWTH",
                price: "$249",
                tagline: "Scale without hiring",
                popular: false,
                accent: "rgba(255,0,110,0.5)",
                features: ["Everything in Pro", "SMS receptionist", "Custom domain", "White-label branding", "Dedicated onboarding"],
              },
            ].map((plan) => (
              <div
                key={plan.name}
                className="glass rounded-2xl p-8 flex flex-col relative overflow-hidden"
                style={{
                  border: plan.popular ? "1px solid rgba(123,47,255,0.5)" : "1px solid rgba(0,212,255,0.12)",
                  boxShadow: plan.popular ? "0 0 60px rgba(123,47,255,0.2), 0 0 120px rgba(123,47,255,0.1)" : "none",
                }}
              >
                {/* Top bar */}
                <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: plan.popular ? "linear-gradient(90deg, #00d4ff, #7b2fff, #ff006e)" : `linear-gradient(90deg, transparent, ${plan.accent}, transparent)` }} />

                {plan.popular && (
                  <span className="inline-block text-xs font-black px-3 py-1 rounded-full mb-4 w-fit uppercase tracking-widest" style={{ background: "rgba(123,47,255,0.3)", color: "#a78bfa", border: "1px solid rgba(123,47,255,0.4)" }}>
                    ★ Most Popular
                  </span>
                )}
                <div className="text-sm font-black tracking-widest mb-1 text-white">{plan.name}</div>
                <div className="text-xs mb-5" style={{ color: "rgba(255,255,255,0.3)" }}>{plan.tagline}</div>
                <div className="text-5xl font-black text-white mb-8">
                  {plan.price}<span className="text-base font-normal" style={{ color: "rgba(255,255,255,0.3)" }}>/mo</span>
                </div>
                <ul className="space-y-3 flex-1 mb-8">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm" style={{ color: "rgba(255,255,255,0.55)" }}>
                      <span className="flex-shrink-0 mt-0.5" style={{ color: "#00d4ff" }}>✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/register"
                  className="btn-neon block text-center py-3.5 rounded-xl font-black text-sm tracking-widest uppercase"
                >
                  Start free trial
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative z-10 max-w-2xl mx-auto px-6 py-20 text-center">
        <p className="text-xs font-bold uppercase tracking-widest mb-6" style={{ color: "#00d4ff" }}>// READY?</p>
        <h2 className="text-6xl font-black text-white mb-4 leading-none">
          MEET<br />
          <span className="glow-cyan" style={{ color: "#00d4ff" }}>HAILEY</span>
        </h2>
        <p className="mb-10" style={{ color: "rgba(255,255,255,0.4)" }}>30 days free. No card needed. She&apos;ll be answering clients before end of day.</p>
        <Link href="/register" className="btn-neon inline-block px-12 py-5 rounded-2xl font-black text-lg tracking-widest uppercase shadow-2xl">
          LET&apos;S GET STARTED →
        </Link>
      </section>

      {/* Footer */}
      <footer className="relative z-10 py-8 text-center text-xs" style={{ borderTop: "1px solid rgba(0,212,255,0.08)", color: "rgba(255,255,255,0.2)" }}>
        © {new Date().getFullYear()} HAILEY AI &nbsp;·&nbsp; Built for local service businesses
      </footer>
    </div>
  );
}
