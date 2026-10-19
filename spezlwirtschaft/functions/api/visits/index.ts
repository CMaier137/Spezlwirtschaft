import { Env, json, badRequest, newId, isFutureVisit } from '../_shared'

// POST /api/visits  { restaurant_id, datum, uhrzeit?, betrag, bezahlt_von }
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const body = await request.json<{
    restaurant_id?: string
    datum?: string
    uhrzeit?: string | null
    betrag?: number
    bezahlt_von?: string
  }>()
  if (!body.restaurant_id || !body.datum) return badRequest('restaurant_id und datum sind erforderlich')
  if (body.uhrzeit && !/^\d{2}:\d{2}$/.test(body.uhrzeit)) return badRequest('uhrzeit muss im Format HH:MM sein')

  const id = newId('v')
  await env.DB.prepare(
    'INSERT INTO visits (id, restaurant_id, datum, uhrzeit, betrag, bezahlt_von) VALUES (?1, ?2, ?3, ?4, ?5, ?6)'
  )
    .bind(id, body.restaurant_id, body.datum, body.uhrzeit ?? null, body.betrag ?? null, body.bezahlt_von ?? null)
    .run()

  return json({ id, is_future: isFutureVisit(body.datum, body.uhrzeit) }, { status: 201 })
}
