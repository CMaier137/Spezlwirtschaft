-- Spezlwirtschaft — Reservierungszeit (Uhrzeit) am Besuch
--
-- Optionale Uhrzeit (Format "HH:MM") zusätzlich zum bisherigen Datum. Liegt
-- Datum+Uhrzeit noch in der Zukunft, gilt der Besuch als "aktive Reservierung"
-- statt als bewertbarer Besuch (siehe isFutureVisit in functions/api/_shared.ts).

ALTER TABLE visits ADD COLUMN uhrzeit TEXT;
