// Spiegelt isFutureVisit() aus functions/api/_shared.ts — dieselbe (bewusst
// vereinfachte, zeitzonen-naive) Logik auf dem Frontend, damit Formulare
// konsistent zum Backend gaten (z. B. Betrag-Feld erst nach dem Termin
// anzeigen), auch bevor eine Antwort vom Server da ist.
export function isFutureVisit(datum: string, uhrzeit?: string | null): boolean {
  const time = uhrzeit && /^\d{2}:\d{2}$/.test(uhrzeit) ? uhrzeit : '23:59'
  const dt = new Date(`${datum}T${time}:00Z`)
  if (Number.isNaN(dt.getTime())) return false
  return dt.getTime() > Date.now()
}
