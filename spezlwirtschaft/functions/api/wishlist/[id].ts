import { Env, json, badRequest } from '../_shared'

// PATCH /api/wishlist/:id  { status: "erledigt" | "offen" }
export const onRequestPatch: PagesFunction<Env> = async ({ request, env, params }) => {
  const id = params.id as string
  const body = await request.json<{ status?: string }>()
  if (body.status !== 'erledigt' && body.status !== 'offen') return badRequest('status muss "erledigt" oder "offen" sein')

  await env.DB.prepare('UPDATE wishlist_items SET status = ?1 WHERE id = ?2').bind(body.status, id).run()
  return json({ ok: true })
}
