CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, username TEXT NOT NULL UNIQUE COLLATE NOCASE, display_name TEXT NOT NULL, bio TEXT NOT NULL DEFAULT '', timezone TEXT NOT NULL DEFAULT 'Asia/Hong_Kong', password_hash TEXT NOT NULL, salt TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS auth_sessions (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS auth_sessions_user ON auth_sessions(user_id);
CREATE INDEX IF NOT EXISTS auth_sessions_expiry ON auth_sessions(expires_at);
CREATE TABLE IF NOT EXISTS account_data (user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, payload TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 0, updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS checkins (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, day TEXT NOT NULL, body TEXT NOT NULL, summary TEXT, created_at TEXT NOT NULL, UNIQUE(user_id, day));
CREATE INDEX IF NOT EXISTS checkins_feed ON checkins(created_at DESC);
CREATE TABLE IF NOT EXISTS auth_limits (key TEXT PRIMARY KEY, count INTEGER NOT NULL, until INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS auth_limits_expiry ON auth_limits(until);
