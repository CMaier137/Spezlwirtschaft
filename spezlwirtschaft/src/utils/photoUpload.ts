// iPhones speichern Fotos standardmäßig im HEIC/HEIF-Format. Fast alle
// Browser außer Safari/WebKit können HEIC weder anzeigen noch dekodieren —
// ein von einem iPhone hochgeladenes HEIC-Foto würde für alle anderen (z. B.
// Android/Chrome) als kaputtes Bild erscheinen, selbst wenn der Upload selbst
// erfolgreich war. Deshalb wird ein HEIC-Foto schon auf dem hochladenden
// Gerät selbst — das es decodieren kann, sonst wäre es dort gar nicht als
// Foto auswählbar — in JPEG umgewandelt, bevor es hochgeladen wird. Das
// Ergebnis ist dann für alle Betrachter:innen unabhängig vom Gerät
// darstellbar.
const HEIC_TYPES = new Set(['image/heic', 'image/heif'])

function looksLikeHeic(file: File): boolean {
  if (HEIC_TYPES.has(file.type.toLowerCase())) return true
  // Manche mobilen Browser liefern bei HEIC/HEIF-Dateien gar keinen
  // Content-Type mit (file.type === '') — dann anhand der Dateiendung raten.
  return file.type === '' && /\.(heic|heif)$/i.test(file.name)
}

export async function prepareImageForUpload(file: File): Promise<File> {
  if (!looksLikeHeic(file)) return file
  try {
    const bitmap = await createImageBitmap(file)
    const canvas = document.createElement('canvas')
    canvas.width = bitmap.width
    canvas.height = bitmap.height
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    ctx.drawImage(bitmap, 0, 0)
    bitmap.close?.()

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9))
    if (!blob) return file

    const newName = file.name.replace(/\.(heic|heif)$/i, '').trim() || 'foto'
    return new File([blob], `${newName}.jpg`, { type: 'image/jpeg' })
  } catch {
    // Das Gerät kann HEIC selbst nicht decodieren — sollte für die Quelle,
    // von der das Foto kam, eigentlich nicht vorkommen. Original-Datei
    // hochladen; das Backend akzeptiert HEIC ebenfalls (s. _shared.ts).
    return file
  }
}
