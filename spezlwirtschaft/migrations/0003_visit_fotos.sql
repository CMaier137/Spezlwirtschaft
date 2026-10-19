-- Spezlwirtschaft — Fotos zu einem Besuch
--
-- Die Bilder selbst liegen in Cloudflare R2 (Binding "PHOTOS"), hier wird nur
-- der R2-Schlüssel referenziert. Mehrere Fotos pro Besuch möglich, von
-- beliebigem Nutzer.

CREATE TABLE IF NOT EXISTS visit_photos (
  id TEXT PRIMARY KEY,
  visit_id TEXT NOT NULL REFERENCES visits(id),
  r2_key TEXT NOT NULL,
  content_type TEXT NOT NULL DEFAULT 'image/jpeg',
  uploaded_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_visit_photos_visit ON visit_photos(visit_id);
