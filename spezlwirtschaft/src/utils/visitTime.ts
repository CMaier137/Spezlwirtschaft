// Spiegelt isFutureVisit() aus functions/api/_shared.ts — dieselbe (bewusst
// vereinfachte, zeitzonen-naive) Logik auf dem Frontend, damit Formulare
// konsistent zum Backend gaten (z. B. Betrag-Feld erst nach dem Termin
// anzeigen), auch bevor eine Antwort vom Server da ist.
//
// Ohne angegebene Uhrzeit wird als Default 00:00 angenommen (nicht 23:59) —
// ein Besuch mit dem heutigen Datum, aber ohne Uhrzeit, gilt damit sofort als
// "nicht mehr in der Zukunft". Das passt zum häufigsten Fall: Besuch direkt
// nach dem Essen am selben Tag eintragen, ohne Uhrzeit anzugeben. Wird
// dagegen eine konkrete (noch bevorstehende) Uhrzeit angegeben, bleibt der
// Besuch bis dahin korrekt als aktive Reservierung erkannt.
export function isFutureVisit(datum: string, uhrzeit?: string | null): boolean {
  const time = uhrzeit && /^\d{2}:\d{2}$/.test(uhrzeit) ? uhrzeit : '00:00'
  const dt = new Date(`${datum}T${time}:00Z`)
  if (Number.isNaN(dt.getTime())) return false
  return dt.getTime() > Date.now()
}
