import { Env, json, badRequest, newId, sortColumn, RANKING_QUERY } from '../_shared'

// GET /api/restaurants?sort=overall|essen|service|ambiente|preis_leistung&kueche=Italienisch
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const url = new URL(request.url)
  const sort = sortColumn(url.searchParams.get('sort'))
  const kueche = url.searchParams.get('kueche')

  let query = RANKING_QUERY
  const bindings: unknown[] = []
  if (kueche && kueche !== 'Alle') {
    query = query.replace('GROUP BY r.id', 'WHERE r.kueche = ?1 GROUP BY r.id')
    bindings.push(kueche)
  }
  query += ` ORDER BY ${sort} IS NULL, ${sort} DESC`

  const stmt = bindings.length ? env.DB.prepare(query).bind(...bindings) : env.DB.prepare(query)
  const { results } = await stmt.all()
  return json(results)
}

// POST /api/restaurants  { name, ort, kueche, created_by }
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const body = await request.json<{ name?: string; ort?: string; kueche?: string; created_by?: string }>()
  if (!body.name || !body.created_by) return badRequest('name und created_by sind erforderlich')

  const id = newId('r')
  await env.DB.prepare(
    'INSERT INTO restaurants (id, name, ort, kueche, created_by) VALUES (?1, ?2, ?3, ?4, ?5)'
  ).bind(id, body.name, body.ort ?? null, body.kueche ?? null, body.created_by).run()

  return json({ id }, { status: 201 })
}
