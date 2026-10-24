import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { useUser } from '../context/UserContext'
import BottomNav from '../components/BottomNav'

// Chrome/Android/Edge feuern dieses Event, wenn die Seite installierbar ist;
// im Standard-TS-DOM-Lib (noch) nicht typisiert.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const INSTALL_HINT_DISMISSED_KEY = 'spezl-install-hint-dismissed'

export default function Home() {
  const { users, currentUser, chooseUser } = useUser()
  const [pendingCount, setPendingCount] = useState<number | null>(null)
  const [wishlistCount, setWishlistCount] = useState<number | null>(null)
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isStandalone, setIsStandalone] = useState(false)
  const [hintDismissed, setHintDismissed] = useState(
    () => localStorage.getItem(INSTALL_HINT_DISMISSED_KEY) === '1'
  )
  const isIOS = /iphone|ipad|ipod/i.test(window.navigator.userAgent)

  useEffect(() => {
    if (!currentUser) return
    let cancelled = false
    api
      .getRestaurants({ sort: 'overall', kueche: 'Alle' })
      .then((restaurants) => Promise.all(restaurants.map((r) => api.getRestaurant(r.id))))
      .then((details) => {
        if (cancelled) return
        const count = details.reduce(
          (sum, d) =>
            sum + d.visits.filter((v) => !v.is_future && !v.ratings.some((r) => r.user_name === currentUser.name)).length,
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

  // Erkennt, ob die App bereits "installiert" (zum Home-Bildschirm hinzugefügt)
  // läuft — dann macht der Hinweis keinen Sinn mehr. display-mode:standalone
  // deckt Android/Chrome/Edge ab, navigator.standalone das ältere iOS-Pendant.
  useEffect(() => {
    const standalone =
      window.matchMedia?.('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true
    setIsStandalone(standalone)
  }, [])

  // Chrome/Android/Edge: bietet einen echten Install-Button statt nur Text.
  // iOS kennt dieses Event nicht — dort bleibt es bei der Anleitung unten.
  useEffect(() => {
    function onBeforeInstallPrompt(e: Event) {
      e.preventDefault()
      setInstallPrompt(e as BeforeInstallPromptEvent)
    }
    function onInstalled() {
      setInstallPrompt(null)
      setIsStandalone(true)
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  async function handleInstall() {
    if (!installPrompt) return
    await installPrompt.prompt()
    setInstallPrompt(null)
  }

  function dismissInstallHint() {
    localStorage.setItem(INSTALL_HINT_DISMISSED_KEY, '1')
    setHintDismissed(true)
  }

  const showInstallHint = !isStandalone && !hintDismissed

  return (
    <div className="page">
      {showInstallHint && (
        <div className="install-hint">
          <span className="install-hint__icon">📲</span>
          <div className="install-hint__text">
            {installPrompt ? (
              <>
                Hol dir die <strong>Spezlwirtschaft</strong> als App — schneller Zugriff direkt vom Home-Bildschirm.
              </>
            ) : isIOS ? (
              <>
                Hol dir die <strong>Spezlwirtschaft</strong> als App: Tippe unten auf <strong>Teilen</strong> ⬆️ und
                dann auf <strong>„Zum Home-Bildschirm“</strong>.
              </>
            ) : (
              <>
                Hol dir die <strong>Spezlwirtschaft</strong> als App — im Browser-Menü „Zum Startbildschirm
                hinzufügen“ wählen.
              </>
            )}
          </div>
          <div className="install-hint__actions">
            {installPrompt && (
              <button type="button" className="install-hint__btn" onClick={handleInstall}>
                Installieren
              </button>
            )}
            <button
              type="button"
              className="install-hint__close"
              onClick={dismissInstallHint}
              aria-label="Hinweis schließen"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <div className="topbar topbar--brand">
        <div className="brand">Spezlwirtschaft</div>
      </div>

      <div className="home-greeting">
        <div className="home-greeting__hey">Servus, {currentUser?.name}!</div>
      </div>

      <div className="home-spruch">Du Baur du Elendiger, lass da schmecka!</div>

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
            <text fontFamily="'IM Fell English', serif" fontSize="8.5" letterSpacing="1" fill="#8a5a1f" opacity="0.7">
              <textPath href="#homeCoasterArcBot" startOffset="50%" textAnchor="middle">
                STAMMTISCH SEIT 1994
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
        <Link to="/rangliste" className="home-shortcut">
          <span className="home-shortcut__n">{pendingCount ?? '—'}</span>offen zu bewerten
        </Link>
        <Link to="/wunschliste" className="home-shortcut">
          <span className="home-shortcut__n">{wishlistCount ?? '—'}</span>auf der Wunschliste
        </Link>
      </div>

      <BottomNav />
    </div>
  )
}
