-- Spezlwirtschaft — initiales Schema

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS restaurants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  ort TEXT,
  kueche TEXT,
  created_by TEXT REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS visits (
  id TEXT PRIMARY KEY,
  restaurant_id TEXT NOT NULL REFERENCES restaurants(id),
  datum TEXT NOT NULL,
  betrag REAL,
  bezahlt_von TEXT REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS ratings (
  id TEXT PRIMARY KEY,
  visit_id TEXT NOT NULL REFERENCES visits(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  essen INTEGER NOT NULL,
  service INTEGER NOT NULL,
  ambiente INTEGER NOT NULL,
  preis_leistung INTEGER NOT NULL,
  kommentar TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(visit_id, user_id)
);

CREATE TABLE IF NOT EXISTS wishlist_items (
  id TEXT PRIMARY KEY,
  vorgeschlagen_von TEXT NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  ort TEXT,
  kueche TEXT,
  notiz TEXT,
  status TEXT NOT NULL DEFAULT 'offen',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_visits_restaurant ON visits(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_ratings_visit ON ratings(visit_id);

-- Die drei festen Nutzer. Namen bei Bedarf anpassen (siehe README).
INSERT OR IGNORE INTO users (id, name) VALUES
  ('u-christian', 'Christian'),
  ('u-basti', 'Basti'),
  ('u-flo', 'Flo');
