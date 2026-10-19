import { Env, json, badRequest, notFound, newId, isFutureVisit } from './_shared'

interface RatingBody {
  visit_id?: string
  user_id?: string
  essen?: number
  service?: number
  ambiente?: number
  preis_leistung?: number
  kommentar?: string
}

// POST /api/ratings — legt eine Bewertung an oder aktualisiert die eigene
// (ein Nutzer kann pro Besuch nur eine Bewertung haben, siehe UNIQUE-Constraint).
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const b = await request.json<RatingBody>()
  if (!b.visit_id || !b.user_id) return badRequest('visit_id und user_id sind erforderlich')
  for (const field of ['essen', 'service', 'ambiente', 'preis_leistung'] as const) {
    const v = b[field]
    if (typeof v !== 'number' || v < 1 || v > 5) return badRequest(`${field} muss zwischen 1 und 5 liegen`)
  }

  const visit = await env.DB.prepare('SELECT datum, uhrzeit FROM visits WHERE id = ?1').bind(b.visit_id).first()
  if (!visit) return notFound('Besuch nicht gefunden')
  if (isFutureVisit(visit.datum as string, visit.uhrzeit as string | null)) {
    return badRequest('Dieser Besuch liegt noch in der Zukunft — Bewertung ist erst danach möglich')
  }

  const id = newId('rt')
  await env.DB.prepare(
    `INSERT INTO ratings (id, visit_id, user_id, essen, service, ambiente, preis_leistung, kommentar)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
     ON CONFLICT(visit_id, user_id) DO UPDATE SET
       essen = excluded.essen,
       service = excluded.service,
       ambiente = excluded.ambiente,
       preis_leistung = excluded.preis_leistung,
       kommentar = excluded.kommentar`
  ).bind(id, b.visit_id, b.user_id, b.essen, b.service, b.ambiente, b.preis_leistung, b.kommentar ?? null).run()

  return json({ ok: true }, { status: 201 })
}
