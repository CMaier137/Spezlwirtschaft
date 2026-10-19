import { Env, notFound } from '../_shared'

// GET /api/photos/:id — liefert die Bilddatei aus R2 (Binding "PHOTOS").
// Bewusst kein öffentlicher R2-Bucket/keine öffentliche R2.dev-URL nötig: die
// App streamt über diese Function, damit Fotos nicht über erratbare
// Bucket-URLs ohne Umweg über die App erreichbar sind.
export const onRequestGet: PagesFunction<Env> = async ({ env, params }) => {
  const id = params.id as string
  const row = await env.DB.prepare('SELECT r2_key, content_type FROM visit_photos WHERE id = ?1').bind(id).first()
  if (!row) return notFound('Foto nicht gefunden')

  const object = await env.PHOTOS.get(row.r2_key as string)
  if (!object) return notFound('Foto nicht gefunden')

  return new Response(object.body, {
    headers: {
      'content-type': (row.content_type as string) || 'image/jpeg',
      'cache-control': 'public, max-age=31536000, immutable'
    }
  })
}

// DELETE /api/photos/:id
export const onRequestDelete: PagesFunction<Env> = async ({ env, params }) => {
  const id = params.id as string
  const row = await env.DB.prepare('SELECT r2_key FROM visit_photos WHERE id = ?1').bind(id).first()
  if (!row) return notFound('Foto nicht gefunden')

  await env.PHOTOS.delete(row.r2_key as string)
  await env.DB.prepare('DELETE FROM visit_photos WHERE id = ?1').bind(id).run()

  return new Response(null, { status: 204 })
}
