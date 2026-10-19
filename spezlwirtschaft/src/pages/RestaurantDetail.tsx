import { useEffect, useState, type ChangeEvent } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { api } from '../api'
import BottomNav from '../components/BottomNav'
import { useUser } from '../context/UserContext'
import { isFutureVisit } from '../utils/visitTime'
import type { RestaurantDetail as RestaurantDetailType, RestaurantVisit } from '../types'

const CATEGORIES = [
  { key: 'avg_essen', label: 'Essen' },
  { key: 'avg_service', label: 'Service' },
  { key: 'avg_ambiente', label: 'Ambiente' },
  { key: 'avg_preis_leistung', label: 'Preis-Leistung' }
] as const

export default function RestaurantDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { currentUser, users } = useUser()
  const [data, setData] = useState<RestaurantDetailType | null>(null)
  const [uploadingVisitId, setUploadingVisitId] = useState<string | null>(null)
  const [photoError, setPhotoError] = useState<string | null>(null)

  const [editingVisitId, setEditingVisitId] = useState<string | null>(null)
  const [editDatum, setEditDatum] = useState('')
  const [editUhrzeit, setEditUhrzeit] = useState('')
  const [editBetrag, setEditBetrag] = useState('')
  const [editBezahltVon, setEditBezahltVon] = useState('')
  const [editError, setEditError] = useState<string | null>(null)
  const [editSaving, setEditSaving] = useState(false)

  function reload() {
    if (id) api.getRestaurant(id).then(setData)
  }
  useEffect(reload, [id])

  async function handlePhotoSelect(visitId: string, e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // dieselbe Datei danach erneut auswählbar machen
    if (!file || !currentUser) return
    setPhotoError(null)
    setUploadingVisitId(visitId)
    try {
      await api.uploadVisitPhoto(visitId, currentUser.id, file)
      reload()
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : 'Foto-Upload fehlgeschlagen.')
    } finally {
      setUploadingVisitId(null)
    }
  }

  async function handleDeletePhoto(photoId: string) {
    await api.deleteVisitPhoto(photoId)
    reload()
  }

  function startEdit(v: RestaurantVisit) {
    setEditError(null)
    setEditingVisitId(v.id)
    setEditDatum(v.datum)
    setEditUhrzeit(v.uhrzeit ?? '')
    setEditBetrag(v.betrag != null ? String(v.betrag) : '')
    setEditBezahltVon(v.bezahlt_von ?? '')
  }

  async function handleEditSave(visitId: string) {
    setEditError(null)
    if (editUhrzeit && !/^\d{2}:\d{2}$/.test(editUhrzeit)) {
      setEditError('Ungültige Uhrzeit (HH:MM).')
      return
    }
    const stillFuture = isFutureVisit(editDatum, editUhrzeit || null)
    setEditSaving(true)
    try {
      await api.updateVisit(visitId, {
        datum: editDatum,
        uhrzeit: editUhrzeit || null,
        // Solange der Besuch (noch) in der Zukunft liegt, lassen wir Betrag/
        // Zahler:in unangetastet (nicht mitsenden) statt sie zu überschreiben —
        // es gibt ja noch keine Rechnung.
        ...(stillFuture ? {} : { betrag: editBetrag ? Number(editBetrag) : null, bezahlt_von: editBezahltVon || null })
      })
      setEditingVisitId(null)
      reload()
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Speichern fehlgeschlagen.')
    } finally {
      setEditSaving(false)
    }
  }

  async function handleDeleteVisit(visitId: string) {
    if (!window.confirm('Diese Reservierung wirklich löschen?')) return
    await api.deleteVisit(visitId)
    reload()
  }

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
      {photoError && <div className="error" style={{ margin: '0 20px 12px' }}>{photoError}</div>}
      <div className="list">
        {data.visits.length === 0 && <div className="hint">Noch keine Besuche erfasst.</div>}
        {data.visits.map((v) => {
          const ownRating = v.ratings.find((r) => r.user_name === currentUser?.name)
          return (
            <div className="card visit-card" key={v.id}>
              <div className="visit-card__top">
                <div className="visit-card__date">
                  {formatDate(v.datum)}
                  {v.uhrzeit ? ` · ${v.uhrzeit} Uhr` : ''}
                </div>
                <div className="hint">
                  {v.avg != null ? `Ø ${v.avg.toFixed(1)}` : 'noch keine Bewertung'}
                  {v.bezahlt_von_name ? ` · bezahlt: ${v.bezahlt_von_name}` : ''}
                </div>
              </div>
              {v.ratings
                .filter((r) => r.kommentar)
                .map((r, i) => (
                  <div className="comment" key={i}>
                    „{r.kommentar}" — {r.user_name}
                  </div>
                ))}

              <div className="photo-row">
                {v.photos.map((p) => (
                  <div className="photo-thumb" key={p.id}>
                    <a href={p.url} target="_blank" rel="noreferrer">
                      <img src={p.url} alt={`Foto von ${p.uploaded_by_name}`} loading="lazy" />
                    </a>
                    <button
                      type="button"
                      className="photo-thumb__delete"
                      aria-label="Foto löschen"
                      onClick={() => handleDeletePhoto(p.id)}
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <label className="photo-add-btn">
                  {uploadingVisitId === v.id ? '…' : '+ Buidl vo meim Essen'}
                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    disabled={uploadingVisitId === v.id}
                    onChange={(e) => handlePhotoSelect(v.id, e)}
                  />
                </label>
              </div>

              {editingVisitId === v.id ? (
                <div className="visit-edit-form">
                  <div className="visit-edit-form__row">
                    <input type="date" value={editDatum} onChange={(e) => setEditDatum(e.target.value)} />
                    <input type="time" value={editUhrzeit} onChange={(e) => setEditUhrzeit(e.target.value)} />
                  </div>
                  {!isFutureVisit(editDatum, editUhrzeit || null) && (
                    <>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Gesamtrechnung (€)"
                        value={editBetrag}
                        onChange={(e) => setEditBetrag(e.target.value)}
                      />
                      <div className="pill-select">
                        {users.map((u) => (
                          <button
                            type="button"
                            key={u.id}
                            className={`pill-select__option ${editBezahltVon === u.id ? 'pill-select__option--active' : ''}`}
                            onClick={() => setEditBezahltVon(u.id)}
                          >
                            {u.name}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                  {editError && <div className="error">{editError}</div>}
                  <div className="visit-edit-form__actions">
                    <button type="button" className="text-link" onClick={() => setEditingVisitId(null)}>
                      Abbrechen
                    </button>
                    <button
                      type="button"
                      className="btn btn--primary"
                      disabled={editSaving}
                      onClick={() => handleEditSave(v.id)}
                    >
                      {editSaving ? 'Speichert …' : 'Speichern'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="visit-card__actions">
                  {v.is_future ? (
                    <div className="reservation-pill">📅 Reserviert{v.uhrzeit ? ` für ${v.uhrzeit} Uhr` : ''}</div>
                  ) : ownRating ? (
                    <Link to={`/besuch/${v.id}/bewerten`} className="rate-cta rate-cta--done">
                      Deine Bewertung bearbeiten →
                    </Link>
                  ) : (
                    <Link to={`/besuch/${v.id}/bewerten`} className="rate-cta">
                      Jetzt bewerten →
                    </Link>
                  )}
                  <button
                    type="button"
                    className="visit-icon-btn"
                    aria-label="Besuch bearbeiten"
                    onClick={() => startEdit(v)}
                  >
                    ✎
                  </button>
                  {v.is_future && (
                    <button
                      type="button"
                      className="visit-icon-btn"
                      aria-label="Reservierung löschen"
                      onClick={() => handleDeleteVisit(v.id)}
                    >
                      ✕
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <BottomNav />
    </div>
  )
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' })
}
