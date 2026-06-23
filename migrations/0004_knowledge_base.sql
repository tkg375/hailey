CREATE TABLE IF NOT EXISTS knowledge_chunks (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL,
  content TEXT NOT NULL,
  source_type TEXT NOT NULL DEFAULT 'manual', -- 'website', 'manual', 'faq', 'service'
  source_label TEXT,                           -- e.g. page URL or doc name
  vectorize_id TEXT,                           -- ID used in Vectorize index
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_business ON knowledge_chunks(business_id);
