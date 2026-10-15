import { Env, json, badRequest, notFound, newId } from '../../_shared'

// POST /api/wishlist/:id/like  { user_id }
// Toggle: existiert noch kein Like von diesem Nutzer für diesen Eintrag, wird
// einer angelegt; existiert schon einer, wird er wieder entfernt.
export const onRequestPost: PagesFunction<Env> = async ({ request, env, params }) => {
  const id = params.id as string
  const body = await request.json<{ user_id?: string }>()
  if (!body.user_id) return badRequest('user_id ist erforderlich')

  const item = await env.DB.prepare('SELECT id FROM wishlist_items WHERE id = ?1').bind(id).first()
  if (!item) return notFound('Wunsch nicht gefunden')

  const existing = await env.DB.prepare(
    'SELECT id FROM wishlist_likes WHERE wishlist_item_id = ?1 AND user_id = ?2'
  )
    .bind(id, body.user_id)
    .first()

  let liked: boolean
  if (existing) {
    await env.DB.prepare('DELETE FROM wishlist_likes WHERE id = ?1').bind(existing.id).run()
    liked = false
  } else {
    await env.DB.prepare('INSERT INTO wishlist_likes (id, wishlist_item_id, user_id) VALUES (?1, ?2, ?3)')
      .bind(newId('wl'), id, body.user_id)
      .run()
    liked = true
  }

  const { count } = (await env.DB.prepare('SELECT COUNT(*) AS count FROM wishlist_likes WHERE wishlist_item_id = ?1')
    .bind(id)
    .first()) as { count: number }

  return json({ liked, like_count: count })
}
