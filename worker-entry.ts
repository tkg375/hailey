import handler from "./.open-next/worker.js";

// The OpenNext-generated worker only exports `fetch`. Cloudflare Cron Triggers invoke
// a `scheduled` handler, which didn't exist here — meaning the analyze/followups crons
// were configured in wrangler.jsonc but never actually fired. This wraps the generated
// worker and adds that missing handler, routing each cron schedule to its endpoint.
const CRON_ROUTES: Record<string, string> = {
  "0 4 * * *": "/api/cron/analyze",
  "0 15 * * *": "/api/cron/followups",
};

export default {
  ...handler,
  async scheduled(controller: ScheduledController, env: any, ctx: ExecutionContext) {
    const path = CRON_ROUTES[controller.cron];
    if (!path) return;
    const base = env.WORKER_BASE_URL || "https://hailey.tgordo03.workers.dev";
    ctx.waitUntil(
      fetch(`${base}${path}`, { headers: { "x-cron-secret": env.CRON_SECRET ?? "" } }).catch(() => {})
    );
  },
};
