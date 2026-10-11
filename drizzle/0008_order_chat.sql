CREATE TABLE IF NOT EXISTS order_messages (
 id TEXT PRIMARY KEY NOT NULL,
 order_id TEXT NOT NULL REFERENCES orders(id),
 sender TEXT NOT NULL,
 body TEXT NOT NULL,
 created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS order_messages_order_idx ON order_messages(order_id,created_at);
