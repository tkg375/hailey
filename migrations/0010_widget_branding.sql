ALTER TABLE businesses ADD COLUMN bot_name TEXT NOT NULL DEFAULT 'Hailey';
ALTER TABLE businesses ADD COLUMN bot_greeting TEXT;
ALTER TABLE businesses ADD COLUMN hide_branding INTEGER NOT NULL DEFAULT 0;
ALTER TABLE businesses ADD COLUMN custom_domain TEXT;
ALTER TABLE businesses ADD COLUMN custom_domain_status TEXT NOT NULL DEFAULT 'none';
