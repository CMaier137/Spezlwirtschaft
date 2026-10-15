import { Env, json, badRequest, newId } from '../_shared'

// GET /api/wishlist?user_id=u-chris — alle offenen und erledigten Wünsche,
// neueste zuerst, jeweils mit Like-Anzahl und (falls user_id übergeben) ob der
// anfragende Nutzer selbst schon geliked hat.
export const onRequestGet: PagesFunction<Env> = async ({ env, request }) => {
  const url = new URL(request.url)
  const userId = url.searchParams.get('user_id') ?? ''

  const { results } = await env.DB.prepare(
    `SELECT w.id, w.name, w.ort, w.kueche, w.notiz, w.status, w.created_at,
            u.id AS vorgeschlagen_von, u.name AS vorgeschlagen_von_name,
            COUNT(wl.id) AS like_count,
            MAX(CASE WHEN wl.user_id = ?1 THEN 1 ELSE 0 END) AS liked_by_me
     FROM wishlist_items w
     JOIN users u ON u.id = w.vorgeschlagen_von
     LEFT JOIN wishlist_likes wl ON wl.wishlist_item_id = w.id
     GROUP BY w.id
     ORDER BY w.created_at DESC`
  )
    .bind(userId)
    .all()

  const withBooleanLike = results.map((r: any) => ({ ...r, liked_by_me: r.liked_by_me === 1 }))
  return json(withBooleanLike)
}

// POST /api/wishlist  { vorgeschlagen_von, name, ort, kueche, notiz }
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const body = await request.json<{
    vorgeschlagen_von?: string; name?: string; ort?: string; kueche?: string; notiz?: string
  }>()
  if (!body.vorgeschlagen_von || !body.name) return badRequest('vorgeschlagen_von und name sind erforderlich')

  const id = newId('w')
  await env.DB.prepare(
    'INSERT INTO wishlist_items (id, vorgeschlagen_von, name, ort, kueche, notiz) VALUES (?1, ?2, ?3, ?4, ?5, ?6)'
  ).bind(id, body.vorgeschlagen_von, body.name, body.ort ?? null, body.kueche ?? null, body.notiz ?? null).run()

  return json({ id }, { status: 201 })
}
