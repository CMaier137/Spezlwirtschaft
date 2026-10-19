import { Env, json, badRequest, notFound, isFutureVisit } from '../_shared'

// GET /api/visits/:id — für die Bewertungsseite: Restaurantname, Datum/Uhrzeit,
// ob der Besuch noch eine aktive Reservierung (in der Zukunft) ist, abgegebene
// Bewertungen und wer von den 3 Nutzern noch fehlt.
export const onRequestGet: PagesFunction<Env> = async ({ env, params }) => {
  const id = params.id as string

  const visit = await env.DB.prepare(
    `SELECT v.id, v.datum, v.uhrzeit, v.restaurant_id, r.name AS restaurant_name
     FROM visits v JOIN restaurants r ON r.id = v.restaurant_id
     WHERE v.id = ?1`
  ).bind(id).first()
  if (!visit) return notFound('Besuch nicht gefunden')

  const { results: allUsers } = await env.DB.prepare('SELECT id, name FROM users ORDER BY sort_order').all()
  const { results: submitted } = await env.DB.prepare(
    'SELECT user_id, essen, service, ambiente, preis_leistung, kommentar FROM ratings WHERE visit_id = ?1'
  ).bind(id).all()

  const submittedIds = new Set((submitted as any[]).map((r) => r.user_id))
  const pending = (allUsers as any[]).filter((u) => !submittedIds.has(u.id))

  return json({
    ...visit,
    is_future: isFutureVisit(visit.datum as string, visit.uhrzeit as string | null),
    ratings: submitted,
    pending_users: pending
  })
}

// PATCH /api/visits/:id  { datum?, uhrzeit?, betrag?, bezahlt_von? }
// Teil-Update — nur übergebene Felder werden geändert. Gedacht vor allem fürs
// Bearbeiten einer Reservierung (Termin verschiebt sich) und fürs Nachtragen
// von Rechnungsbetrag/Zahler:in, sobald ein zunächst zukünftiger Besuch
// stattgefunden hat.
export const onRequestPatch: PagesFunction<Env> = async ({ request, env, params }) => {
  const id = params.id as string
  const current = await env.DB.prepare('SELECT datum, uhrzeit, betrag, bezahlt_von FROM visits WHERE id = ?1')
    .bind(id)
    .first()
  if (!current) return notFound('Besuch nicht gefunden')

  const body = await request.json<{
    datum?: string
    uhrzeit?: string | null
    betrag?: number | null
    bezahlt_von?: string | null
  }>()

  if (body.uhrzeit && !/^\d{2}:\d{2}$/.test(body.uhrzeit)) return badRequest('uhrzeit muss im Format HH:MM sein')

  const datum = body.datum ?? (current.datum as string)
  const uhrzeit = body.uhrzeit !== undefined ? body.uhrzeit : (current.uhrzeit as string | null)
  const betrag = body.betrag !== undefined ? body.betrag : (current.betrag as number | null)
  const bezahltVon = body.bezahlt_von !== undefined ? body.bezahlt_von : (current.bezahlt_von as string | null)

  await env.DB.prepare('UPDATE visits SET datum = ?1, uhrzeit = ?2, betrag = ?3, bezahlt_von = ?4 WHERE id = ?5')
    .bind(datum, uhrzeit, betrag, bezahltVon, id)
    .run()

  return json({ id, is_future: isFutureVisit(datum, uhrzeit) })
}

// DELETE /api/visits/:id — löscht den Besuch inkl. abhängiger Bewertungen und
// Fotos (inkl. der R2-Objekte). Gedacht vor allem fürs Löschen einer nicht
// mehr aktuellen Reservierung.
export const onRequestDelete: PagesFunction<Env> = async ({ env, params }) => {
  const id = params.id as string
  const visit = await env.DB.prepare('SELECT id FROM visits WHERE id = ?1').bind(id).first()
  if (!visit) return notFound('Besuch nicht gefunden')

  const { results: photos } = await env.DB.prepare('SELECT r2_key FROM visit_photos WHERE visit_id = ?1')
    .bind(id)
    .all<{ r2_key: string }>()
  for (const p of photos) {
    await env.PHOTOS.delete(p.r2_key)
  }

  await env.DB.prepare('DELETE FROM visit_photos WHERE visit_id = ?1').bind(id).run()
  await env.DB.prepare('DELETE FROM ratings WHERE visit_id = ?1').bind(id).run()
  await env.DB.prepare('DELETE FROM visits WHERE id = ?1').bind(id).run()

  return new Response(null, { status: 204 })
}
