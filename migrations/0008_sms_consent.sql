ALTER TABLE businesses ADD COLUMN sms_consent_required INTEGER NOT NULL DEFAULT 0;
ALTER TABLE businesses ADD COLUMN sms_consent_text TEXT;
