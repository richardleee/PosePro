CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  google_sub TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS subscriptions (
  user_id UUID PRIMARY KEY REFERENCES users(id),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  status TEXT NOT NULL DEFAULT 'free',
  price_interval TEXT,
  trial_end TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS planner_usage (
  user_id UUID NOT NULL REFERENCES users(id),
  utc_date DATE NOT NULL,
  count INT NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, utc_date)
);

CREATE TABLE IF NOT EXISTS share_cards (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  revoked_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS profile_sync (
  user_id UUID PRIMARY KEY REFERENCES users(id),
  ciphertext TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS erasure_requests (
  user_id UUID PRIMARY KEY REFERENCES users(id),
  requested_at TIMESTAMPTZ DEFAULT now(),
  due_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ
);
