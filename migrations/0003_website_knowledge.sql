ALTER TABLE businesses ADD COLUMN website_url TEXT;
ALTER TABLE businesses ADD COLUMN website_content TEXT; -- JSON blob of scraped knowledge
ALTER TABLE businesses ADD COLUMN website_scraped_at TEXT;
