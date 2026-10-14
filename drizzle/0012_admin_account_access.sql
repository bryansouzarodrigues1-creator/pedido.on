-- Additive: administrative SaaS entitlements are NOT payment transactions.
CREATE TABLE IF NOT EXISTS account_access (
 owner_id TEXT PRIMARY KEY NOT NULL,
 mode TEXT NOT NULL DEFAULT 'normal' CHECK (mode IN ('normal','grant','suspended')),
 plan TEXT CHECK (plan IS NULL OR plan IN ('essencial','profissional','rede')),
 expires_at INTEGER,
 reason TEXT NOT NULL DEFAULT '',
 updated_by TEXT NOT NULL,
 updated_at TEXT NOT NULL,
 version INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS account_access_events (
 id TEXT PRIMARY KEY NOT NULL,
 owner_id TEXT NOT NULL,
 actor_id TEXT NOT NULL,
 action TEXT NOT NULL,
 plan TEXT,
 expires_at INTEGER,
 reason TEXT NOT NULL,
 created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS account_access_events_owner_idx ON account_access_events(owner_id,created_at);
