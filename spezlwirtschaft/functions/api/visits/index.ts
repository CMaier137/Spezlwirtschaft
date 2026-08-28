import { Env, json, badRequest, newId } from '../_shared'

// POST /api/visits  { restaurant_id, datum, betrag, bezahlt_von }
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const body = await request.json<{ restaurant_id?: string; datum?: string; betrag?: number; bezahlt_von?: string }>()
  if (!body.restaurant_id || !body.datum) return badRequest('restaurant_id und datum sind erforderlich')

  const id = newId('v')
  await env.DB.prepare(
    'INSERT INTO visits (id, restaurant_id, datum, betrag, bezahlt_von) VALUES (?1, ?2, ?3, ?4, ?5)'
  ).bind(id, body.restaurant_id, body.datum, body.betrag ?? null, body.bezahlt_von ?? null).run()

  return json({ id }, { status: 201 })
}
