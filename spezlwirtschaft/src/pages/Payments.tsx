import { useEffect, useState } from 'react'
import { api } from '../api'
import BottomNav from '../components/BottomNav'
import type { PaymentStats } from '../types'

export default function Payments() {
  const [stats, setStats] = useState<PaymentStats | null>(null)

  useEffect(() => {
    api.getPaymentStats().then(setStats)
  }, [])

  if (!stats) return <div className="page-center">Lädt …</div>

  const maxTotal = Math.max(1, ...stats.per_user.map((u) => u.total))

  return (
    <div className="page">
      <div className="topbar">
        <div className="page-title">Zahlungen</div>
      </div>

      {(stats.next_up || stats.last_paid) && (
        <div className="callout">
          {stats.next_up && <div className="callout__title">Nächstes Mal dran: {stats.next_up.name}</div>}
          {stats.last_paid && (
            <div className="callout__sub">
              zuletzt bezahlt: {stats.last_paid.name}, {formatDate(stats.last_paid.datum)}
            </div>
          )}
        </div>
      )}

      <div className="list">
        {stats.per_user.map((u) => (
          <div className="card payment-card" key={u.id}>
            <div className="payment-card__top">
              <div className="avatar avatar--sm">{u.name[0]}</div>
              <div className="row-card__title" style={{ flex: 1 }}>
                {u.name}
              </div>
              <div className="hint">
                {u.count}× · € {u.total.toFixed(0)}
              </div>
            </div>
            <div className="bar">
              <div className="bar__fill" style={{ width: `${(u.total / maxTotal) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
      <div className="hint hint--center">Verteilung basiert auf allen bisherigen Besuchen</div>

      <BottomNav />
    </div>
  )
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('de-DE')
}
