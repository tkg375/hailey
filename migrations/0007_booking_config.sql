ALTER TABLE businesses ADD COLUMN booking_system TEXT; -- e.g. 'custom', 'acuity', 'jane', 'square', 'calendly', 'mindbody'
ALTER TABLE businesses ADD COLUMN booking_fields_required TEXT; -- owner-defined list of fields to collect
ALTER TABLE businesses ADD COLUMN booking_payment_required INTEGER NOT NULL DEFAULT 0;
ALTER TABLE businesses ADD COLUMN booking_payment_details TEXT; -- how much, when, how payment is collected
