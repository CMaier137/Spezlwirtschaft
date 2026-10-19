import { Env, json, notFound, RANKING_QUERY, isFutureVisit } from '../_shared'

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
    `SELECT v.id, v.datum, v.uhrzeit, v.betrag, u.name AS bezahlt_von_name
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

  const { results: photos } = await env.DB.prepare(
    `SELECT p.id, p.visit_id, p.created_at, u.name AS uploaded_by_name
     FROM visit_photos p
     JOIN users u ON u.id = p.uploaded_by
     JOIN visits v ON v.id = p.visit_id
     WHERE v.restaurant_id = ?1
     ORDER BY p.created_at ASC`
  ).bind(id).all<{ id: string; visit_id: string; created_at: string; uploaded_by_name: string }>()

  const visitsWithRatings = (visits as any[]).map((v) => {
    const own = ratings.filter((r) => r.visit_id === v.id)
    const avg = own.length
      ? own.reduce((sum, r) => sum + (r.essen + r.service + r.ambiente + r.preis_leistung) / 4, 0) / own.length
      : null
    const ownPhotos = photos
      .filter((p) => p.visit_id === v.id)
      .map((p) => ({ id: p.id, url: `/api/photos/${p.id}`, uploaded_by_name: p.uploaded_by_name, created_at: p.created_at }))
    return {
      ...v,
      avg,
      ratings: own,
      photos: ownPhotos,
      is_future: isFutureVisit(v.datum as string, v.uhrzeit as string | null)
    }
  })

  return json({ ...restaurant, visits: visitsWithRatings })
}
