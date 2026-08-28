import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../api'
import { useUser } from '../context/UserContext'
import StarRating from '../components/StarRating'
import type { VisitDetail } from '../types'

const CATEGORIES = [
  { key: 'essen', label: 'Essen' },
  { key: 'service', label: 'Service' },
  { key: 'ambiente', label: 'Ambiente' },
  { key: 'preis_leistung', label: 'Preis-Leistung' }
] as const

type CategoryKey = (typeof CATEGORIES)[number]['key']

export default function Rating() {
  const { visitId } = useParams()
  const navigate = useNavigate()
  const { currentUser } = useUser()
  const [visit, setVisit] = useState<VisitDetail | null>(null)
  const [scores, setScores] = useState<Record<CategoryKey, number>>({
    essen: 0,
    service: 0,
    ambiente: 0,
    preis_leistung: 0
  })
  const [kommentar, setKommentar] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (visitId) api.getVisit(visitId).then(setVisit)
  }, [visitId])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (Object.values(scores).some((v) => v === 0)) {
      setError('Bitte alle vier Kategorien bewerten.')
      return
    }
    setSubmitting(true)
    try {
      await api.submitRating({ visit_id: visitId, user_id: currentUser?.id, kommentar, ...scores })
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Etwas ist schiefgelaufen.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!visit) return <div className="page-center">Lädt …</div>

  if (done) {
    return (
      <div className="page-center">
        <div className="page-title">Danke!</div>
        <p className="hint">Deine Bewertung wurde gespeichert.</p>
        <button className="btn btn--primary" onClick={() => navigate(`/restaurants/${visit.restaurant_id}`)}>
          Zum Restaurant
        </button>
      </div>
    )
  }

  const submittedCount = 3 - visit.pending_users.length

  return (
    <div className="page">
      <div className="topbar">
        <div className="page-title page-title--sm">{visit.restaurant_name}</div>
        <div className="hint">{formatDate(visit.datum)} · deine Bewertung</div>
      </div>

      <div className="status-banner">{submittedCount} von 3 haben schon bewertet</div>

      <form className="form" onSubmit={handleSubmit}>
        {CATEGORIES.map((c) => (
          <div className="field" key={c.key}>
            <span className="field__label">{c.label}</span>
            <StarRating value={scores[c.key]} onChange={(v) => setScores((s) => ({ ...s, [c.key]: v }))} />
          </div>
        ))}

        <label className="field">
          <span className="field__label">Kommentar (optional)</span>
          <textarea
            value={kommentar}
            onChange={(e) => setKommentar(e.target.value)}
            placeholder="Dein Kommentar …"
            rows={3}
          />
        </label>

        {error && <div className="error">{error}</div>}

        <button type="submit" className="btn btn--primary" disabled={submitting}>
          {submitting ? 'Speichert …' : 'Bewertung abschicken'}
        </button>
      </form>
    </div>
  )
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' })
}
