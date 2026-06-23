-- Business FAQs: learned or manually entered Q&A pairs
CREATE TABLE IF NOT EXISTS business_faqs (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'manual', -- 'manual' or 'learned'
  confidence REAL NOT NULL DEFAULT 1.0,
  times_asked INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Business insights: aggregated learning from conversations
CREATE TABLE IF NOT EXISTS business_insights (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id),
  insight_type TEXT NOT NULL, -- 'top_question', 'booking_intent', 'peak_hours', 'drop_off_point'
  insight_key TEXT NOT NULL,
  insight_value TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 1,
  last_seen_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_faqs_business ON business_faqs(business_id, active);
CREATE INDEX IF NOT EXISTS idx_insights_business ON business_insights(business_id, insight_type);
CREATE UNIQUE INDEX IF NOT EXISTS idx_insights_unique ON business_insights(business_id, insight_type, insight_key);
