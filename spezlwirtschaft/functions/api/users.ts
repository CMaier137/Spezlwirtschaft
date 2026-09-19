import { Env, json } from './_shared'

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const { results } = await env.DB.prepare('SELECT id, name FROM users ORDER BY sort_order').all()
  return json(results)
}
