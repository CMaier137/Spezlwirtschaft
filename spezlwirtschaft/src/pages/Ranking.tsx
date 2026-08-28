import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { useUser } from '../context/UserContext'
import BottomNav from '../components/BottomNav'
import type { RestaurantSummary } from '../types'

const SORT_OPTIONS = [
  { value: 'overall', label: 'Gesamt', field: 'overall_score' as const },
  { value: 'essen', label: 'Essen', field: 'avg_essen' as const },
  { value: 'service', label: 'Service', field: 'avg_service' as const },
  { value: 'ambiente', label: 'Ambiente', field: 'avg_ambiente' as const },
  { value: 'preis_leistung', label: 'Preis-Leistung', field: 'avg_preis_leistung' as const }
]

export default function Ranking() {
  const { currentUser } = useUser()
  const [restaurants, setRestaurants] = useState<RestaurantSummary[]>([])
  const [sort, setSort] = useState('overall')
  const [kueche, setKueche] = useState('Alle')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    api
      .getRestaurants({ sort, kueche })
      .then(setRestaurants)
      .finally(() => setLoading(false))
  }, [sort, kueche])

  const kuechen = useMemo(() => {
    const set = new Set(restaurants.map((r) => r.kueche).filter(Boolean) as string[])
    return ['Alle', ...Array.from(set).sort()]
  }, [restaurants])

  const scoreField = SORT_OPTIONS.find((o) => o.value === sort)?.field ?? 'overall_score'

  return (
    <div className="page">
      <div className="topbar topbar--brand">
        <div className="brand">Spezlwirtschaft</div>
        {currentUser && <div className="avatar avatar--sm">{currentUser.name[0]}</div>}
      </div>

      <h1 className="page-title">Rangliste</h1>

      <div className="chip-row">
        {kuechen.map((k) => (
          <button key={k} className={`chip ${kueche === k ? 'chip--active' : ''}`} onClick={() => setKueche(k)}>
            {k}
          </button>
        ))}
      </div>

      <div className="sort-row">
        <span>Sortiert nach</span>
        <select value={sort} onChange={(e) => setSort(e.target.value)}>
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <div className="list">
        {loading && <div className="hint">Lädt …</div>}
        {!loading && restaurants.length === 0 && (
          <div className="hint">Noch keine Restaurants — leg das erste über + an.</div>
        )}
        {restaurants.map((r, i) => {
          const score = (r as any)[scoreField] as number | null
          return (
            <Link to={`/restaurants/${r.id}`} key={r.id} className={`card row-card ${i === 0 ? 'row-card--first' : ''}`}>
              <div className={`rank-badge ${i === 0 ? 'rank-badge--first' : ''}`}>{i + 1}</div>
              <div className="row-card__body">
                <div className="row-card__title">{r.name}</div>
                <div className="row-card__meta">
                  {r.kueche ?? '—'} · {r.visit_count} {r.visit_count === 1 ? 'Besuch' : 'Besuche'}
                </div>
              </div>
              <div className="score">{score != null ? score.toFixed(1) : '—'}</div>
            </Link>
          )
        })}
      </div>

      <BottomNav />
    </div>
  )
}
