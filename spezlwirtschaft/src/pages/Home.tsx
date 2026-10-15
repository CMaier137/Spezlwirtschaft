import { useEffect, useState } from 'react'
import { api } from '../api'
import { useUser } from '../context/UserContext'
import BottomNav from '../components/BottomNav'

export default function Home() {
  const { users, currentUser, chooseUser } = useUser()
  const [pendingCount, setPendingCount] = useState<number | null>(null)
  const [wishlistCount, setWishlistCount] = useState<number | null>(null)

  useEffect(() => {
    if (!currentUser) return
    let cancelled = false
    api
      .getRestaurants({ sort: 'overall', kueche: 'Alle' })
      .then((restaurants) => Promise.all(restaurants.map((r) => api.getRestaurant(r.id))))
      .then((details) => {
        if (cancelled) return
        const count = details.reduce(
          (sum, d) => sum + d.visits.filter((v) => !v.ratings.some((r) => r.user_name === currentUser.name)).length,
          0
        )
        setPendingCount(count)
      })
    return () => {
      cancelled = true
    }
  }, [currentUser])

  useEffect(() => {
    api.getWishlist().then((items) => setWishlistCount(items.filter((i) => i.status === 'offen').length))
  }, [])

  return (
    <div className="page">
      <div className="topbar topbar--brand">
        <div className="brand">Spezlwirtschaft</div>
      </div>

      <div className="home-greeting">
        <div className="home-greeting__hey">Servus, {currentUser?.name}!</div>
      </div>

      <div className="home-spruch">„Du Baur du Elendiger, lass da schmecka!“</div>

      <div className="coaster-stage">
        <div className="coaster-wrap">
          <svg viewBox="0 0 160 160" width="190" height="190">
            <defs>
              <filter id="homeCoasterGrain" x="-20%" y="-20%" width="140%" height="140%">
                <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="3" result="n" />
                <feColorMatrix
                  in="n"
                  type="matrix"
                  values="0 0 0 0 0.25  0 0 0 0 0.19  0 0 0 0 0.1  0 0 0 0.18 0"
                  result="g"
                />
                <feComposite in="g" in2="SourceGraphic" operator="in" />
              </filter>
              <path id="homeCoasterArcTop" d="M 24 80 A 56 56 0 0 1 136 80" />
              <path id="homeCoasterArcBot" d="M 32 112 A 52 52 0 0 0 128 112" />
            </defs>
            <circle cx="80" cy="80" r="76" fill="#f2e3c6" />
            <circle cx="80" cy="80" r="76" filter="url(#homeCoasterGrain)" />
            <circle cx="80" cy="80" r="76" fill="none" stroke="#cf9f3f" strokeWidth="2" />
            <circle cx="80" cy="80" r="64" fill="none" stroke="#cf9f3f" strokeWidth="1.2" strokeDasharray="1 3" opacity="0.8" />
            <ellipse cx="96" cy="66" rx="34" ry="30" fill="none" stroke="#8a5a1f" strokeWidth="2.5" opacity="0.22" />
            <text fontFamily="'IM Fell English', serif" fontSize="11" letterSpacing="3" fill="#8a5a1f" opacity="0.85">
              <textPath href="#homeCoasterArcTop" startOffset="50%" textAnchor="middle">
                SPEZLWIRTSCHAFT
              </textPath>
            </text>
            <text fontFamily="'IM Fell English', serif" fontSize="9" letterSpacing="2" fill="#8a5a1f" opacity="0.7">
              <textPath href="#homeCoasterArcBot" startOffset="50%" textAnchor="middle">
                STAMMTISCH SEIT 2026
              </textPath>
            </text>
            <text
              x="80"
              y="98"
              fontFamily="'IM Fell English', serif"
              fontSize="58"
              fill="#6b3a1f"
              opacity="0.88"
              textAnchor="middle"
              transform="rotate(-4 80 80)"
            >
              {currentUser?.name[0] ?? '?'}
            </text>
          </svg>
        </div>
      </div>

      <div className="user-switch">
        <div className="user-switch__label">Nicht du? Hier umschalten</div>
        <div className="user-switch__row">
          {users.map((u) => (
            <button
              key={u.id}
              className={`user-chip ${currentUser?.id === u.id ? 'user-chip--active' : ''}`}
              onClick={() => chooseUser(u.id)}
            >
              <div className="avatar">{u.name[0]}</div>
              {u.name}
            </button>
          ))}
        </div>
      </div>

      <div className="home-shortcuts">
        <div className="home-shortcut">
          <span className="home-shortcut__n">{pendingCount ?? '—'}</span>offen zu bewerten
        </div>
        <div className="home-shortcut">
          <span className="home-shortcut__n">{wishlistCount ?? '—'}</span>auf der Wunschliste
        </div>
      </div>

      <BottomNav />
    </div>
  )
}
