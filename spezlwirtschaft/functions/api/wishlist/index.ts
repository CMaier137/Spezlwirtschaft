import { Env, json, badRequest, newId } from '../_shared'

// GET /api/wishlist — alle offenen und erledigten Wünsche, neueste zuerst
export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const { results } = await env.DB.prepare(
    `SELECT w.id, w.name, w.ort, w.kueche, w.notiz, w.status, w.created_at,
            u.id AS vorgeschlagen_von, u.name AS vorgeschlagen_von_name
     FROM wishlist_items w
     JOIN users u ON u.id = w.vorgeschlagen_von
     ORDER BY w.created_at DESC`
  ).all()
  return json(results)
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
