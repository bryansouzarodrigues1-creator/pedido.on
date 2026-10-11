-- New opt-in flow. No existing order, shop, trial or billing row is modified.
CREATE TABLE IF NOT EXISTS delivery_checks (
 id TEXT PRIMARY KEY NOT NULL,
 restaurant_id TEXT NOT NULL REFERENCES restaurants(id),
 request_id TEXT NOT NULL,
 token_hash TEXT NOT NULL,
 phone TEXT NOT NULL,
 address TEXT NOT NULL,
 latitude REAL,
 longitude REAL,
 status TEXT NOT NULL DEFAULT 'pending',
 version INTEGER NOT NULL DEFAULT 1,
 created_at TEXT NOT NULL,
 expires_at INTEGER NOT NULL,
 reviewed_at TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS delivery_checks_request_idx ON delivery_checks(restaurant_id,request_id);
CREATE INDEX IF NOT EXISTS delivery_checks_owner_queue_idx ON delivery_checks(restaurant_id,status,created_at);
