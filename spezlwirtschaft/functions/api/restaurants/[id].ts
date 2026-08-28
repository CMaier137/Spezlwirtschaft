import { Env, json, notFound, RANKING_QUERY } from '../_shared'

interface RatingRow {
  visit_id: string
  user_name: string
  essen: number
  service: number
  ambiente: number
  preis_leistung: number
  kommentar: string | null
}

// GET /api/restaurants/:id — Detailseite: Score-Breakdown + alle Besuche mit Bewertungen
export const onRequestGet: PagesFunction<Env> = async ({ env, params }) => {
  const id = params.id as string

  const scoreQuery = RANKING_QUERY.replace('GROUP BY r.id', 'WHERE r.id = ?1 GROUP BY r.id')
  const restaurant = await env.DB.prepare(scoreQuery).bind(id).first()
  if (!restaurant) return notFound('Restaurant nicht gefunden')

  const { results: visits } = await env.DB.prepare(
    `SELECT v.id, v.datum, v.betrag, u.name AS bezahlt_von_name
     FROM visits v
     LEFT JOIN users u ON u.id = v.bezahlt_von
     WHERE v.restaurant_id = ?1
     ORDER BY v.datum DESC`
  ).bind(id).all()

  const { results: ratings } = await env.DB.prepare(
    `SELECT rt.visit_id, u.name AS user_name, rt.essen, rt.service, rt.ambiente, rt.preis_leistung, rt.kommentar
     FROM ratings rt
     JOIN users u ON u.id = rt.user_id
     JOIN visits v ON v.id = rt.visit_id
     WHERE v.restaurant_id = ?1`
  ).bind(id).all<RatingRow>()

  const visitsWithRatings = (visits as any[]).map((v) => {
    const own = ratings.filter((r) => r.visit_id === v.id)
    const avg = own.length
      ? own.reduce((sum, r) => sum + (r.essen + r.service + r.ambiente + r.preis_leistung) / 4, 0) / own.length
      : null
    return { ...v, avg, ratings: own }
  })

  return json({ ...restaurant, visits: visitsWithRatings })
}
