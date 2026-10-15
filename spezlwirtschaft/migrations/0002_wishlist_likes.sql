-- Spezlwirtschaft — "I like" auf der Wunschliste
--
-- Pro Wunschlisten-Eintrag und Nutzer höchstens ein Like (Toggle: erneutes
-- Antippen entfernt den eigenen Like wieder, statt den Zähler hochzuzählen).

CREATE TABLE IF NOT EXISTS wishlist_likes (
  id TEXT PRIMARY KEY,
  wishlist_item_id TEXT NOT NULL REFERENCES wishlist_items(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(wishlist_item_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_wishlist_likes_item ON wishlist_likes(wishlist_item_id);
