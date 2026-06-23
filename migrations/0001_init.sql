-- Businesses (tenants)
CREATE TABLE IF NOT EXISTS businesses (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  industry TEXT NOT NULL DEFAULT 'general',
  email TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  timezone TEXT NOT NULL DEFAULT 'America/New_York',
  logo_url TEXT,
  primary_color TEXT NOT NULL DEFAULT '#6366f1',
  tagline TEXT,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  plan TEXT NOT NULL DEFAULT 'trial',
  trial_ends_at TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Business owners (auth)
CREATE TABLE IF NOT EXISTS owners (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Business hours
CREATE TABLE IF NOT EXISTS business_hours (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id),
  day_of_week INTEGER NOT NULL, -- 0=Sun, 1=Mon, ... 6=Sat
  open_time TEXT, -- e.g. "09:00"
  close_time TEXT, -- e.g. "17:00"
  is_closed INTEGER NOT NULL DEFAULT 0
);

-- Services offered by each business
CREATE TABLE IF NOT EXISTS services (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id),
  name TEXT NOT NULL,
  description TEXT,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  price_cents INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Clients (customers of the business)
CREATE TABLE IF NOT EXISTS clients (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  notes TEXT,
  tags TEXT, -- JSON array
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_visit_at TEXT
);

-- Appointments
CREATE TABLE IF NOT EXISTS appointments (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id),
  client_id TEXT REFERENCES clients(id),
  service_id TEXT REFERENCES services(id),
  client_name TEXT NOT NULL,
  client_email TEXT,
  client_phone TEXT,
  service_name TEXT NOT NULL,
  date TEXT NOT NULL, -- YYYY-MM-DD
  time TEXT NOT NULL, -- HH:MM
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  price_cents INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'confirmed', -- confirmed, cancelled, completed, no_show
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Follow-up sequences
CREATE TABLE IF NOT EXISTS followup_sequences (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id),
  name TEXT NOT NULL,
  trigger TEXT NOT NULL, -- 'post_visit', 'no_show', 'reengagement', 'birthday'
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Follow-up steps (emails/SMS in a sequence)
CREATE TABLE IF NOT EXISTS followup_steps (
  id TEXT PRIMARY KEY,
  sequence_id TEXT NOT NULL REFERENCES followup_sequences(id),
  delay_hours INTEGER NOT NULL DEFAULT 24,
  channel TEXT NOT NULL DEFAULT 'email', -- 'email' or 'sms'
  subject TEXT,
  body TEXT NOT NULL,
  step_order INTEGER NOT NULL DEFAULT 1
);

-- Sent messages log
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id),
  client_id TEXT REFERENCES clients(id),
  appointment_id TEXT REFERENCES appointments(id),
  channel TEXT NOT NULL, -- 'email' or 'sms'
  to_address TEXT NOT NULL,
  subject TEXT,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent', -- sent, failed
  sent_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- AI chat conversations
CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id),
  visitor_name TEXT,
  visitor_email TEXT,
  visitor_phone TEXT,
  channel TEXT NOT NULL DEFAULT 'web', -- 'web' or 'sms'
  status TEXT NOT NULL DEFAULT 'open', -- open, resolved, booked
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS conversation_messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES conversations(id),
  role TEXT NOT NULL, -- 'user' or 'assistant'
  content TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Super admin
CREATE TABLE IF NOT EXISTS super_admins (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_appointments_business_date ON appointments(business_id, date);
CREATE INDEX IF NOT EXISTS idx_clients_business ON clients(business_id);
CREATE INDEX IF NOT EXISTS idx_services_business ON services(business_id);
CREATE INDEX IF NOT EXISTS idx_messages_business ON messages(business_id);
CREATE INDEX IF NOT EXISTS idx_conversations_business ON conversations(business_id);
