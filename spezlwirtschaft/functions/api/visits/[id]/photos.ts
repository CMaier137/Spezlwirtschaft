import { Env, json, badRequest, notFound, newId, PHOTO_EXT } from '../../_shared'

const MAX_BYTES = 8 * 1024 * 1024 // 8 MB

// POST /api/visits/:id/photos — multipart/form-data mit Feldern:
//   photo (Datei), uploaded_by (Nutzer-id)
// Legt das Bild in R2 ab (Binding "PHOTOS") und referenziert es in visit_photos.
export const onRequestPost: PagesFunction<Env> = async ({ request, env, params }) => {
  const visitId = params.id as string
  const visit = await env.DB.prepare('SELECT id FROM visits WHERE id = ?1').bind(visitId).first()
  if (!visit) return notFound('Besuch nicht gefunden')

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return badRequest('Erwarte multipart/form-data mit Feld "photo"')
  }

  // @cloudflare/workers-types typisiert FormData.get() nur als `string | null`,
  // obwohl die Workers-Runtime bei Datei-Feldern tatsächlich ein File-Objekt
  // liefert — daher der Umweg über `unknown` für die instanceof-Prüfung.
  const file = form.get('photo') as unknown as File | string | null
  const uploadedBy = form.get('uploaded_by')
  if (!(file instanceof File)) return badRequest('Feld "photo" (Datei) ist erforderlich')
  if (typeof uploadedBy !== 'string' || !uploadedBy) return badRequest('uploaded_by ist erforderlich')
  if (!file.type.startsWith('image/')) return badRequest('Nur Bilddateien sind erlaubt')
  if (file.size > MAX_BYTES) return badRequest('Datei ist zu groß (max. 8 MB)')

  const ext = PHOTO_EXT[file.type] ?? 'jpg'
  const id = newId('photo')
  const key = `visits/${visitId}/${id}.${ext}`

  await env.PHOTOS.put(key, await file.arrayBuffer(), { httpMetadata: { contentType: file.type } })
  await env.DB.prepare(
    'INSERT INTO visit_photos (id, visit_id, r2_key, content_type, uploaded_by) VALUES (?1, ?2, ?3, ?4, ?5)'
  )
    .bind(id, visitId, key, file.type, uploadedBy)
    .run()

  return json({ id, url: `/api/photos/${id}` }, { status: 201 })
}
