CREATE TABLE IF NOT EXISTS web_push_devices (
  device_id text PRIMARY KEY,
  user_id text NOT NULL,
  subscription jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS web_push_reminders (
  device_id text NOT NULL REFERENCES web_push_devices(device_id) ON DELETE CASCADE,
  reminder_id text NOT NULL,
  fingerprint text NOT NULL,
  title text NOT NULL,
  release_date text NOT NULL,
  due_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  status text NOT NULL CHECK (status IN ('scheduled', 'sending', 'delivered', 'missed')),
  attempts integer NOT NULL DEFAULT 0,
  retry_at timestamptz NOT NULL DEFAULT now(),
  lease_token text,
  lease_until timestamptz,
  PRIMARY KEY (device_id, reminder_id)
);

CREATE INDEX IF NOT EXISTS web_push_due ON web_push_reminders (due_at, retry_at)
  WHERE status IN ('scheduled', 'sending');

CREATE UNIQUE INDEX IF NOT EXISTS web_push_endpoint
  ON web_push_devices ((subscription->>'endpoint'));
