import { Env, json, notFound } from '../_shared'

// GET /api/visits/:id — für die Bewertungsseite: Restaurantname, Datum,
// abgegebene Bewertungen und wer von den 3 Nutzern noch fehlt.
export const onRequestGet: PagesFunction<Env> = async ({ env, params }) => {
  const id = params.id as string

  const visit = await env.DB.prepare(
    `SELECT v.id, v.datum, v.restaurant_id, r.name AS restaurant_name
     FROM visits v JOIN restaurants r ON r.id = v.restaurant_id
     WHERE v.id = ?1`
  ).bind(id).first()
  if (!visit) return notFound('Besuch nicht gefunden')

  const { results: allUsers } = await env.DB.prepare('SELECT id, name FROM users ORDER BY name').all()
  const { results: submitted } = await env.DB.prepare(
    'SELECT user_id, essen, service, ambiente, preis_leistung, kommentar FROM ratings WHERE visit_id = ?1'
  ).bind(id).all()

  const submittedIds = new Set((submitted as any[]).map((r) => r.user_id))
  const pending = (allUsers as any[]).filter((u) => !submittedIds.has(u.id))

  return json({ ...visit, ratings: submitted, pending_users: pending })
}
