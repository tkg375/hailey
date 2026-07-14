-- Hailey's own record of what she did and how it went — separate from client-facing knowledge.
-- Feeds the nightly analyze cron so she can improve her own task performance over time.
CREATE TABLE IF NOT EXISTS hailey_task_events (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id),
  conversation_id TEXT REFERENCES conversations(id),
  event_type TEXT NOT NULL, -- 'booking_completed', 'booking_abandoned', 'escalated', 'cancelled', 'rescheduled', 'unresolved'
  detail TEXT,              -- free-text reason/context, e.g. escalation reason or abandonment point
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_task_events_business ON hailey_task_events(business_id, event_type);

-- Learned self-improvement notes derived from task_events (e.g. "clients abandon at payment step")
CREATE TABLE IF NOT EXISTS hailey_learnings (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id),
  category TEXT NOT NULL, -- 'friction_point', 'escalation_pattern', 'success_pattern'
  summary TEXT NOT NULL,
  occurrences INTEGER NOT NULL DEFAULT 1,
  last_seen_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_learnings_unique ON hailey_learnings(business_id, category, summary);
