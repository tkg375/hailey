import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

const HAILEY_URL = "https://hailey.tgordo03.workers.dev";

export default async function WidgetPage() {
  const session = await requireAuth();

  const embedScript = `<!-- Hailey AI Receptionist -->
<script src="${HAILEY_URL}/widget.v2.js" data-business-id="${session.businessId}" async></script>`;

  const iframeEmbed = `<iframe
  src="${HAILEY_URL}/chat/${session.businessId}"
  style="width:100%;height:600px;border:none;border-radius:16px;"
  allow="microphone"
></iframe>`;

  return (
    <>
      <div className="mb-8">
        <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "rgba(0,212,255,0.5)" }}>// CHAT WIDGET</p>
        <h1 className="text-2xl md:text-3xl font-black text-white">Embed on Your Site</h1>
        <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.35)" }}>
          Drop one of these snippets into your website. Hailey loads from our servers — your site stays fast.
        </p>
      </div>

      <div className="space-y-6 max-w-2xl">
        {/* Floating bubble */}
        <div className="glass rounded-2xl p-6 relative overflow-hidden" style={{ border: "1px solid rgba(0,212,255,0.2)" }}>
          <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: "linear-gradient(90deg, transparent, #00d4ff, transparent)" }} />
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="font-black text-white">Floating Bubble</h3>
              <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>Recommended — adds a chat bubble in the corner of any page</p>
            </div>
            <span className="text-xs font-black uppercase px-2 py-1 rounded-lg" style={{ background: "rgba(0,212,255,0.12)", color: "#00d4ff", border: "1px solid rgba(0,212,255,0.3)" }}>
              Recommended
            </span>
          </div>
          <pre
            className="rounded-xl p-4 text-xs overflow-x-auto"
            style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.06)", color: "#a3e635", fontFamily: "monospace", whiteSpace: "pre-wrap", wordBreak: "break-all" }}
          >{embedScript}</pre>
          <p className="text-xs mt-3" style={{ color: "rgba(255,255,255,0.3)" }}>Paste this before the closing <code style={{ color: "rgba(0,212,255,0.6)" }}>&lt;/body&gt;</code> tag.</p>
        </div>

        {/* Inline iframe */}
        <div className="glass rounded-2xl p-6 relative overflow-hidden" style={{ border: "1px solid rgba(123,47,255,0.2)" }}>
          <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: "linear-gradient(90deg, transparent, #7b2fff, transparent)" }} />
          <div className="mb-3">
            <h3 className="font-black text-white">Inline Chat</h3>
            <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>Embed Hailey directly in a page — no floating bubble</p>
          </div>
          <pre
            className="rounded-xl p-4 text-xs overflow-x-auto"
            style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.06)", color: "#a3e635", fontFamily: "monospace", whiteSpace: "pre-wrap", wordBreak: "break-all" }}
          >{iframeEmbed}</pre>
        </div>

        {/* API */}
        <div className="glass rounded-2xl p-6 relative overflow-hidden" style={{ border: "1px solid rgba(255,0,110,0.2)" }}>
          <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: "linear-gradient(90deg, transparent, #ff006e, transparent)" }} />
          <div className="mb-4">
            <h3 className="font-black text-white">Direct API</h3>
            <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>Build your own UI and call Hailey's API directly</p>
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-xs font-black uppercase tracking-widest mb-1.5" style={{ color: "rgba(255,0,110,0.7)" }}>Endpoint</p>
              <pre className="rounded-xl p-3 text-xs" style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.06)", color: "#a3e635", fontFamily: "monospace" }}>
{`POST ${HAILEY_URL}/api/chat/${session.businessId}`}
              </pre>
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-widest mb-1.5" style={{ color: "rgba(255,0,110,0.7)" }}>Request Body</p>
              <pre className="rounded-xl p-3 text-xs" style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.06)", color: "#a3e635", fontFamily: "monospace" }}>
{`{
  "message": "Do you have availability Saturday?",
  "conversationId": "optional-to-keep-context"
}`}
              </pre>
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-widest mb-1.5" style={{ color: "rgba(255,0,110,0.7)" }}>Response</p>
              <pre className="rounded-xl p-3 text-xs" style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.06)", color: "#a3e635", fontFamily: "monospace" }}>
{`{
  "reply": "Yes! We have 10am, 1pm, and 3:30pm open.",
  "conversationId": "conv_abc123",
  "bookingRequest": null
}`}
              </pre>
            </div>
          </div>
        </div>

        {/* Business ID */}
        <div className="glass rounded-2xl p-4 flex items-center gap-4" style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
            <span className="font-black uppercase tracking-widest" style={{ color: "rgba(0,212,255,0.5)" }}>Your Business ID</span><br />
            <span className="font-mono" style={{ color: "rgba(255,255,255,0.6)" }}>{session.businessId}</span>
          </div>
        </div>
      </div>
    </>
  );
}
