import { useEffect, useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useUser } from '../context/UserContext'
import BottomNav from '../components/BottomNav'
import { isFutureVisit } from '../utils/visitTime'
import type { RestaurantSummary, WishlistItem } from '../types'

export default function NewVisit() {
  const navigate = useNavigate()
  const location = useLocation()
  const { users, currentUser } = useUser()
  const [restaurants, setRestaurants] = useState<RestaurantSummary[]>([])
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([])
  const [restaurantId, setRestaurantId] = useState('')
  const [creatingNew, setCreatingNew] = useState(false)
  const [showExisting, setShowExisting] = useState(false)
  const [newName, setNewName] = useState('')
  const [newOrt, setNewOrt] = useState('')
  const [newKueche, setNewKueche] = useState('')
  const [datum, setDatum] = useState(() => new Date().toISOString().slice(0, 10))
  const [uhrzeit, setUhrzeit] = useState('')
  const [betrag, setBetrag] = useState('')
  const [bezahltVon, setBezahltVon] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.getRestaurants({ sort: 'overall', kueche: 'Alle' }).then(setRestaurants)
  }, [])

  useEffect(() => {
    api.getWishlist(currentUser?.id).then((items) => {
      const open = items
        .filter((i) => i.status === 'offen')
        .sort((a, b) => b.like_count - a.like_count || (a.created_at < b.created_at ? 1 : -1))
      setWishlistItems(open)
    })
  }, [currentUser])

  useEffect(() => {
    if (!bezahltVon && currentUser) setBezahltVon(currentUser.id)
  }, [currentUser, bezahltVon])

  const willBeFuture = isFutureVisit(datum, uhrzeit || null)
  const popularWishes = wishlistItems.filter((w) => w.like_count >= 2)

  function pickWish(item: WishlistItem) {
    setCreatingNew(true)
    setShowExisting(false)
    setNewName(item.name)
    setNewOrt(item.ort ?? '')
    setNewKueche(item.kueche ?? '')
  }

  // Direktsprung von der Wunschliste über das Kalender-Symbol: übernimmt
  // Name/Ort/Küche des gewählten Wunschs automatisch (wie beim Klick auf
  // einen Wunsch-Chip), Datum/Uhrzeit etc. bleiben weiterhin manuell zu
  // definieren. Läuft nur einmal beim Mount — die Seite wird bei jeder
  // Navigation von der Wunschliste hierher frisch gemountet.
  useEffect(() => {
    const wish = (location.state as { wish?: WishlistItem } | null)?.wish
    if (wish) pickWish(wish)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      let rId = restaurantId
      if (creatingNew) {
        if (!newName.trim()) throw new Error('Bitte einen Restaurantnamen eingeben.')
        const created = await api.createRestaurant({
          name: newName,
          ort: newOrt,
          kueche: newKueche,
          created_by: currentUser?.id
        })
        rId = created.id
      }
      if (!rId) throw new Error('Bitte ein Restaurant auswählen oder neu anlegen.')

      const visit = await api.createVisit({
        restaurant_id: rId,
        datum,
        uhrzeit: uhrzeit || null,
        betrag: willBeFuture ? null : betrag ? Number(betrag) : null,
        bezahlt_von: willBeFuture ? null : bezahltVon || null
      })
      if (visit.is_future) {
        navigate(`/restaurants/${rId}`)
      } else {
        navigate(`/besuch/${visit.id}/bewerten`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Etwas ist schiefgelaufen.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="page">
      <div className="topbar topbar--form">
        <button type="button" className="text-link" onClick={() => navigate(-1)}>
          Abbrechen
        </button>
        <div className="page-title page-title--sm">Neuer Besuch</div>
        <div style={{ width: 70 }} />
      </div>

      <form className="form" onSubmit={handleSubmit}>
        <div className="field">
          <span className="field__label">Restaurant</span>
          {creatingNew ? (
            <div className="new-restaurant-fields">
              <input placeholder="Name" value={newName} onChange={(e) => setNewName(e.target.value)} />
              <input placeholder="Ort" value={newOrt} onChange={(e) => setNewOrt(e.target.value)} />
              <input
                placeholder="Kulinarische Richtung"
                value={newKueche}
                onChange={(e) => setNewKueche(e.target.value)}
              />
              <button type="button" className="text-link" onClick={() => setCreatingNew(false)}>
                Stattdessen von der Wunschliste wählen
              </button>
            </div>
          ) : showExisting ? (
            <>
              <select value={restaurantId} onChange={(e) => setRestaurantId(e.target.value)}>
                <option value="">Restaurant wählen …</option>
                {restaurants.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="text-link"
                onClick={() => {
                  setShowExisting(false)
                  setRestaurantId('')
                }}
                style={{ marginTop: 8 }}
              >
                Zurück zur Wunschliste
              </button>
            </>
          ) : (
            <>
              {popularWishes.length > 0 ? (
                <div className="chip-row" style={{ padding: 0, flexWrap: 'wrap' }}>
                  {popularWishes.map((w) => (
                    <button type="button" key={w.id} className="chip" onClick={() => pickWish(w)}>
                      {w.name} <span style={{ opacity: 0.7 }}>♥{w.like_count}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <button
                  type="button"
                  className="text-link text-link--cta"
                  onClick={() => navigate('/wunschliste')}
                >
                  Aus Wunschliste auswählen
                </button>
              )}
              <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
                <button type="button" className="text-link text-link--cta" onClick={() => setCreatingNew(true)}>
                  + Neues Restaurant anlegen
                </button>
                <button type="button" className="text-link" onClick={() => setShowExisting(true)}>
                  Bereits besuchtes Restaurant auswählen
                </button>
              </div>
            </>
          )}
        </div>

        <label className="field">
          <span className="field__label">Datum</span>
          <input type="date" value={datum} onChange={(e) => setDatum(e.target.value)} />
        </label>

        <label className="field">
          <span className="field__label">Uhrzeit (optional)</span>
          <input type="time" value={uhrzeit} onChange={(e) => setUhrzeit(e.target.value)} />
        </label>
        <p className="hint" style={{ margin: '-8px 0 0' }}>
          Liegt Datum/Uhrzeit noch in der Zukunft, erscheint der Besuch als Reservierung — bewertet werden kann er
          erst danach.
        </p>

        {willBeFuture ? (
          <p className="hint">
            Rechnungsbetrag und Zahler:in trägst du nach dem Termin ein — über das Bearbeiten-Symbol (✎) bei der
            Reservierung.
          </p>
        ) : (
          <>
            <label className="field">
              <span className="field__label">Gesamtrechnung (€)</span>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="132.50"
                value={betrag}
                onChange={(e) => setBetrag(e.target.value)}
              />
            </label>

            <div className="field">
              <span className="field__label">Bezahlt von</span>
              <div className="pill-select">
                {users.map((u) => (
                  <button
                    type="button"
                    key={u.id}
                    className={`pill-select__option ${bezahltVon === u.id ? 'pill-select__option--active' : ''}`}
                    onClick={() => setBezahltVon(u.id)}
                  >
                    {u.name}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {error && <div className="error">{error}</div>}

        <button type="submit" className="btn btn--primary" disabled={submitting}>
          {submitting ? 'Speichert …' : willBeFuture ? 'Reservierung anlegen →' : 'Bewertung starten →'}
        </button>
      </form>

      <BottomNav />
    </div>
  )
}
