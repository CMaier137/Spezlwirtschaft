import { Env, json } from './_shared'

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const { results } = await env.DB.prepare('SELECT id, name FROM users ORDER BY name').all()
  return json(results)
}
