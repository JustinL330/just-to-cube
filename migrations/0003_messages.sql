CREATE TABLE IF NOT EXISTS dm_keys (user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, public_key TEXT NOT NULL, vault TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS dm_messages (seq INTEGER PRIMARY KEY AUTOINCREMENT, id TEXT NOT NULL UNIQUE, sender TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, recipient TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, envelope TEXT NOT NULL, created_at TEXT NOT NULL, CHECK(sender <> recipient));
CREATE INDEX IF NOT EXISTS dm_sender_seq ON dm_messages(sender,seq);
CREATE INDEX IF NOT EXISTS dm_recipient_seq ON dm_messages(recipient,seq);
