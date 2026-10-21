CREATE TABLE IF NOT EXISTS forum_zones (id TEXT PRIMARY KEY, name TEXT NOT NULL, owner_id TEXT NOT NULL REFERENCES users(id), password_hash TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS forum_zones_owner ON forum_zones(owner_id);
CREATE TABLE IF NOT EXISTS forum_members (zone_id TEXT NOT NULL REFERENCES forum_zones(id) ON DELETE CASCADE, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, joined_at TEXT NOT NULL, PRIMARY KEY(zone_id,user_id));
CREATE INDEX IF NOT EXISTS forum_members_user ON forum_members(user_id,zone_id);
CREATE TABLE IF NOT EXISTS forum_posts (id TEXT PRIMARY KEY, zone_id TEXT REFERENCES forum_zones(id) ON DELETE CASCADE, user_id TEXT NOT NULL REFERENCES users(id), body TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS forum_posts_feed ON forum_posts(zone_id,created_at DESC,id DESC);
CREATE TABLE IF NOT EXISTS forum_images (id TEXT PRIMARY KEY, post_id TEXT NOT NULL REFERENCES forum_posts(id) ON DELETE CASCADE, mime TEXT NOT NULL, data BLOB NOT NULL, position INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS forum_images_post ON forum_images(post_id,position);
