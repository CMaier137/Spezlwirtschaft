// Gemeinsame Hilfsfunktionen für die Pages Functions.
// Dateien mit führendem Unterstrich werden von Cloudflare Pages nicht als Route behandelt.

export interface Env {
  DB: D1Database
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
    AVG(va.preis_leistung) AS avg_preis_leistung
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
  GROUP BY r.id
`
