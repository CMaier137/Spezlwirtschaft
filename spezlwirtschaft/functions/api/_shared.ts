// Gemeinsame Hilfsfunktionen für die Pages Functions.
// Dateien mit führendem Unterstrich werden von Cloudflare Pages nicht als Route behandelt.

export interface Env {
  DB: D1Database
  PHOTOS: R2Bucket
}

export function json(data: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: { 'content-type': 'application/json; charset=utf-8', ...(init.headers || {}) }
  })
}

export function badRequest(message: string): Response {
  return json({ error: message }, { status: 400 })
}

export function notFound(message = 'Nicht gefunden'): Response {
  return json({ error: message }, { status: 404 })
}

export function newId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`
}

const ALLOWED_SORT: Record<string, string> = {
  overall: 'overall_score',
  essen: 'avg_essen',
  service: 'avg_service',
  ambiente: 'avg_ambiente',
  preis_leistung: 'avg_preis_leistung'
}

export function sortColumn(sort: string | null): string {
  return ALLOWED_SORT[sort ?? 'overall'] ?? ALLOWED_SORT.overall
}

// Liegt ein Besuch (Datum + optionale Uhrzeit) noch in der Zukunft?
// Ohne Uhrzeit gilt der ganze Tag noch als "nicht vergangen" (bis 23:59).
//
// Vereinfachung: Datum/Uhrzeit werden als UTC interpretiert statt als
// tatsächliche lokale Zeit der Nutzer. Für Termine, die Stunden oder Tage im
// Voraus geplant werden, macht das keinen Unterschied — nur exakt am
// Umschlagzeitpunkt (±die lokale UTC-Differenz) könnte die Einstufung kurz
// abweichen. Für eine private 3-Personen-App unproblematisch.
export function isFutureVisit(datum: string, uhrzeit?: string | null): boolean {
  const time = uhrzeit && /^\d{2}:\d{2}$/.test(uhrzeit) ? uhrzeit : '23:59'
  const dt = new Date(`${datum}T${time}:00Z`)
  if (Number.isNaN(dt.getTime())) return false
  return dt.getTime() > Date.now()
}

// Dateiendung passend zum Content-Type eines hochgeladenen Fotos.
export const PHOTO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/heic': 'heic'
}

// Score-Query: pro Besuch werden zuerst die Kategorie-Durchschnitte über alle
// abgegebenen Bewertungen gebildet, danach je Restaurant der Durchschnitt über
// alle Besuche (jeder Besuch zählt gleich viel, unabhängig von der Anzahl der
// Bewertungen). Restaurants ohne Bewertung erscheinen mit score = null.
export const RANKING_QUERY = `
  SELECT
    r.id, r.name, r.ort, r.kueche, r.created_at,
    COUNT(DISTINCT va.visit_id) AS visit_count,
    AVG(va.overall) AS overall_score,
    AVG(va.essen) AS avg_essen,
    AVG(va.service) AS avg_service,
    AVG(va.ambiente) AS avg_ambiente,
    AVG(va.preis_leistung) AS avg_preis_leistung,
    lv.id AS latest_visit_id,
    lv.rated_count AS latest_visit_rated_count
  FROM restaurants r
  LEFT JOIN (
    SELECT
      v.id AS visit_id,
      v.restaurant_id,
      AVG(rt.essen) AS essen,
      AVG(rt.service) AS service,
      AVG(rt.ambiente) AS ambiente,
      AVG(rt.preis_leistung) AS preis_leistung,
      (AVG(rt.essen) + AVG(rt.service) + AVG(rt.ambiente) + AVG(rt.preis_leistung)) / 4.0 AS overall
    FROM visits v
    JOIN ratings rt ON rt.visit_id = v.id
    GROUP BY v.id
  ) va ON va.restaurant_id = r.id
  LEFT JOIN (
    -- Jeweils nur der jüngste VERGANGENE Besuch pro Restaurant (aktive
    -- Reservierungen in der Zukunft zählen bewusst nicht mit — die können ja
    -- noch gar nicht bewertet sein). Grobe Prüfung über das Datum allein
    -- (ohne Uhrzeit) reicht für diese Übersicht.
    SELECT
      v.id,
      v.restaurant_id,
      (SELECT COUNT(*) FROM ratings rt WHERE rt.visit_id = v.id) AS rated_count
    FROM visits v
    WHERE v.datum <= date('now')
      AND v.id = (
        SELECT v2.id FROM visits v2
        WHERE v2.restaurant_id = v.restaurant_id AND v2.datum <= date('now')
        ORDER BY v2.datum DESC, v2.created_at DESC
        LIMIT 1
      )
  ) lv ON lv.restaurant_id = r.id
  GROUP BY r.id
`
