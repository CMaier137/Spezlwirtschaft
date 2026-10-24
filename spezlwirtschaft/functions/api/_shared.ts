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
// Ohne Uhrzeit wird 00:00 angenommen — ein Besuch mit dem heutigen Datum,
// aber ohne Uhrzeit, gilt damit sofort als "nicht mehr in der Zukunft". Das
// passt zum häufigsten Fall: Besuch direkt nach dem Essen am selben Tag
// eintragen, ohne Uhrzeit anzugeben (dann sollen Rechnungsbetrag/Zahler:in
// sofort eintragbar und der Besuch sofort bewertbar sein). Wird dagegen eine
// konkrete, noch bevorstehende Uhrzeit angegeben, bleibt der Besuch bis dahin
// korrekt als aktive Reservierung erkannt.
//
// Vereinfachung: Datum/Uhrzeit werden als UTC interpretiert statt als
// tatsächliche lokale Zeit der Nutzer. Für Termine, die Stunden oder Tage im
// Voraus geplant werden, macht das keinen Unterschied — nur exakt am
// Umschlagzeitpunkt (±die lokale UTC-Differenz) könnte die Einstufung kurz
// abweichen. Für eine private 3-Personen-App unproblematisch.
export function isFutureVisit(datum: string, uhrzeit?: string | null): boolean {
  const time = uhrzeit && /^\d{2}:\d{2}$/.test(uhrzeit) ? uhrzeit : '00:00'
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
  'image/heic': 'heic',
  'image/heif': 'heif'
}

// Fallback, falls der Browser beim Upload gar keinen (oder einen leeren)
// Content-Type mitschickt — kommt in der Praxis bei manchen mobilen Browsern
// speziell bei HEIC/HEIF-Fotos vor. Dann wird der Typ anhand der
// Dateiendung geraten, statt den Upload pauschal abzulehnen.
export const IMAGE_TYPE_BY_EXT: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  heic: 'image/heic',
  heif: 'image/heif'
}

// Ermittelt einen Bild-Content-Type für eine hochgeladene Datei: bevorzugt
// den vom Browser gesetzten `file.type`, sonst anhand der Dateiendung
// geschätzt. Gibt null zurück, wenn beides fehlschlägt (dann wird der Upload
// abgelehnt).
//
// "application/octet-stream" wird wie ein fehlender Content-Type behandelt:
// das ist der Standard-Fallback-Wert, den Browser für multipart/form-data
// einsetzen, wenn sie den eigentlichen Dateityp nicht erkennen (kommt in der
// Praxis bei HEIC/HEIF-Fotos von manchen mobilen Browsern vor) — ein echtes,
// leeres `file.type` ist beim tatsächlichen Transport über HTTP selten zu
// erwarten.
export function resolveImageType(file: File): string | null {
  if (file.type && file.type !== 'application/octet-stream') return file.type
  const match = /\.([a-z0-9]+)$/i.exec(file.name || '')
  const ext = match?.[1]?.toLowerCase()
  return ext ? (IMAGE_TYPE_BY_EXT[ext] ?? null) : null
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
