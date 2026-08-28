import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useUser } from '../context/UserContext'
import type { RestaurantSummary } from '../types'

export default function NewVisit() {
  const navigate = useNavigate()
  const { users, currentUser } = useUser()
  const [restaurants, setRestaurants] = useState<RestaurantSummary[]>([])
  const [restaurantId, setRestaurantId] = useState('')
  const [creatingNew, setCreatingNew] = useState(false)
  const [newName, setNewName] = useState('')
  const [newOrt, setNewOrt] = useState('')
  const [newKueche, setNewKueche] = useState('')
  const [datum, setDatum] = useState(() => new Date().toISOString().slice(0, 10))
  const [betrag, setBetrag] = useState('')
  const [bezahltVon, setBezahltVon] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.getRestaurants({ sort: 'overall', kueche: 'Alle' }).then(setRestaurants)
  }, [])

  useEffect(() => {
    if (!bezahltVon && currentUser) setBezahltVon(currentUser.id)
  }, [currentUser, bezahltVon])

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
        betrag: betrag ? Number(betrag) : null,
        bezahlt_von: bezahltVon || null
      })
      navigate(`/besuch/${visit.id}/bewerten`)
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
          {!creatingNew ? (
            <>
              <select value={restaurantId} onChange={(e) => setRestaurantId(e.target.value)}>
                <option value="">Restaurant wählen …</option>
                {restaurants.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
              <button type="button" className="text-link" onClick={() => setCreatingNew(true)} style={{ marginTop: 8 }}>
                + Neues Restaurant anlegen
              </button>
            </>
          ) : (
            <div className="new-restaurant-fields">
              <input placeholder="Name" value={newName} onChange={(e) => setNewName(e.target.value)} />
              <input placeholder="Ort" value={newOrt} onChange={(e) => setNewOrt(e.target.value)} />
              <input
                placeholder="Kulinarische Richtung"
                value={newKueche}
                onChange={(e) => setNewKueche(e.target.value)}
              />
              <button type="button" className="text-link" onClick={() => setCreatingNew(false)}>
                Stattdessen bestehendes Restaurant wählen
              </button>
            </div>
          )}
        </div>

        <label className="field">
          <span className="field__label">Datum</span>
          <input type="date" value={datum} onChange={(e) => setDatum(e.target.value)} />
        </label>

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

        {error && <div className="error">{error}</div>}

        <button type="submit" className="btn btn--primary" disabled={submitting}>
          {submitting ? 'Speichert …' : 'Bewertung starten →'}
        </button>
      </form>
    </div>
  )
}
