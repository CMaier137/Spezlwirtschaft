import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../api'
import BottomNav from '../components/BottomNav'
import type { RestaurantDetail as RestaurantDetailType } from '../types'

const CATEGORIES = [
  { key: 'avg_essen', label: 'Essen' },
  { key: 'avg_service', label: 'Service' },
  { key: 'avg_ambiente', label: 'Ambiente' },
  { key: 'avg_preis_leistung', label: 'Preis-Leistung' }
] as const

export default function RestaurantDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState<RestaurantDetailType | null>(null)

  useEffect(() => {
    if (id) api.getRestaurant(id).then(setData)
  }, [id])

  if (!data) {
    return (
      <div className="page">
        <div className="page-center" style={{ flex: 1, minHeight: 0 }}>
          Lädt …
        </div>
        <BottomNav />
      </div>
    )
  }

  return (
    <div className="page">
      <div className="topbar">
        <button className="back-link" onClick={() => navigate(-1)}>
          ← Rangliste
        </button>
      </div>

      <div className="detail-header">
        <div className="page-title">{data.name}</div>
        {data.ort && <div className="hint">{data.ort}</div>}
        {data.kueche && <div className="tag">{data.kueche}</div>}
      </div>

      <div className="score-summary">
        <div className="score-circle">{data.overall_score != null ? data.overall_score.toFixed(1) : '—'}</div>
        <div>
          <div className="score-summary__label">Ø Gesamtscore</div>
          <div className="hint">aus {data.visit_count} {data.visit_count === 1 ? 'Besuch' : 'Besuchen'}</div>
        </div>
      </div>

      <div className="breakdown">
        {CATEGORIES.map((c) => {
          const value = data[c.key] as number | null
          return (
            <div className="breakdown-row" key={c.key}>
              <div className="breakdown-row__label">{c.label}</div>
              <div className="bar">
                <div className="bar__fill" style={{ width: `${value ? (value / 5) * 100 : 0}%` }} />
              </div>
              <div className="breakdown-row__value">{value != null ? value.toFixed(1) : '—'}</div>
            </div>
          )
        })}
      </div>

      <div className="section-title">Besuche</div>
      <div className="list">
        {data.visits.length === 0 && <div className="hint">Noch keine Besuche erfasst.</div>}
        {data.visits.map((v) => (
          <div className="card visit-card" key={v.id}>
            <div className="visit-card__top">
              <div className="visit-card__date">{formatDate(v.datum)}</div>
              <div className="hint">
                {v.avg != null ? `Ø ${v.avg.toFixed(1)}` : 'noch keine Bewertung'}
                {v.bezahlt_von_name ? ` · bezahlt: ${v.bezahlt_von_name}` : ''}
              </div>
            </div>
            {v.ratings
              .filter((r) => r.kommentar)
              .map((r, i) => (
                <div className="comment" key={i}>
                  „{r.kommentar}“ — {r.user_name}
                </div>
              ))}
          </div>
        ))}
      </div>

      <BottomNav />
    </div>
  )
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' })
}
