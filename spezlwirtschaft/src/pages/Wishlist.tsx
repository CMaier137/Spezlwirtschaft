import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useUser } from '../context/UserContext'
import BottomNav from '../components/BottomNav'
import type { WishlistItem } from '../types'

export default function Wishlist() {
  const navigate = useNavigate()
  const { currentUser } = useUser()
  const [items, setItems] = useState<WishlistItem[]>([])
  const [tab, setTab] = useState<'mine' | 'all'>('all')
  const [sortMode, setSortMode] = useState<'popular' | 'neu'>('popular')
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [ort, setOrt] = useState('')
  const [kueche, setKueche] = useState('')
  const [notiz, setNotiz] = useState('')
  const formRef = useRef<HTMLFormElement>(null)

  function reload() {
    api.getWishlist(currentUser?.id).then(setItems)
  }
  useEffect(reload, [currentUser])

  // Beim Öffnen des Formulars (Klick auf "+") automatisch dorthin scrollen,
  // damit sofort sichtbar ist, dass etwas auszufüllen ist — besonders bei
  // einer langen Liste, wo der Button weit oben im sichtbaren Bereich sitzt.
  useEffect(() => {
    if (showForm) formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [showForm])

  const openItems = items.filter((i) => i.status === 'offen')
  const mineCount = openItems.filter((i) => i.vorgeschlagen_von === currentUser?.id).length
  const allCount = openItems.length
  const visible =
    tab === 'mine'
      ? openItems.filter((i) => i.vorgeschlagen_von === currentUser?.id)
      : sortMode === 'popular'
        ? [...openItems].sort((a, b) => b.like_count - a.like_count || (a.created_at < b.created_at ? 1 : -1))
        : openItems

  async function handleLike(id: string) {
    if (!currentUser) return
    await api.toggleWishlistLike(id, currentUser.id)
    reload()
  }

  async function handleAdd(e: FormEvent) {
    e.preventDefault()
    if (!name.trim() || !currentUser) return
    await api.createWishlistItem({ vorgeschlagen_von: currentUser.id, name, ort, kueche, notiz })
    setName('')
    setOrt('')
    setKueche('')
    setNotiz('')
    setShowForm(false)
    reload()
  }

  async function markDone(id: string) {
    await api.updateWishlistStatus(id, 'erledigt')
    reload()
  }

  // Plant direkt einen Besuch für diesen Wunsch — macht auf "Neuer Besuch"
  // genau das, was ein Klick auf den Wunsch-Chip dort auch tut (Name/Ort/
  // Küche vorausfüllen, "Neues Restaurant anlegen"-Modus), nur eben direkt
  // von der Wunschliste aus angestoßen. Datum/Uhrzeit etc. bleiben dort
  // weiterhin manuell einzutragen.
  function planVisit(item: WishlistItem) {
    navigate('/besuch/neu', { state: { wish: item } })
  }

  return (
    <div className="page">
      <div className="topbar">
        <div className="page-title">wo mägstn hi?</div>
      </div>

      <div className="segmented">
        <button
          className={`segmented__option ${tab === 'mine' ? 'segmented__option--active' : ''}`}
          onClick={() => setTab('mine')}
        >
          Meine Liste<span className="segmented__count">{mineCount}</span>
        </button>
        <button
          className={`segmented__option ${tab === 'all' ? 'segmented__option--active' : ''}`}
          onClick={() => setTab('all')}
        >
          Alle<span className="segmented__count">{allCount}</span>
        </button>
      </div>

      {tab === 'all' && (
        <div className="sort-toggle-mini">
          <button className={sortMode === 'popular' ? 'active' : ''} onClick={() => setSortMode('popular')}>
            Meistgewünscht
          </button>
          <button className={sortMode === 'neu' ? 'active' : ''} onClick={() => setSortMode('neu')}>
            Neueste
          </button>
        </div>
      )}

      <div className="list">
        {visible.length === 0 && <div className="hint">Noch nichts auf der Liste.</div>}
        {visible.map((item, i) => {
          const isTop = tab === 'all' && sortMode === 'popular' && i === 0 && item.like_count > 0
          return (
            <div className={`card wishlist-card ${isTop ? 'wishlist-card--top' : ''}`} key={item.id}>
              {isTop && <div className="badge-popular">Beliebt</div>}
              <div>
                <div className="row-card__title">{item.name}</div>
                <div className="hint">{[item.ort, item.kueche].filter(Boolean).join(' · ')}</div>
                {item.notiz && <div className="comment">„{item.notiz}“</div>}
                <div className="hint hint--faint">vorgeschlagen von {item.vorgeschlagen_von_name}</div>
                {tab === 'all' && (
                  <button
                    className={`like-btn ${item.liked_by_me ? 'like-btn--liked' : ''}`}
                    onClick={() => handleLike(item.id)}
                  >
                    <span className="like-btn__heart">{item.liked_by_me ? '♥' : '♡'}</span>
                    {item.like_count}
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginLeft: 'auto', flexShrink: 0 }}>
                <button
                  type="button"
                  className="visit-icon-btn"
                  onClick={() => planVisit(item)}
                  aria-label="Besuch für diesen Wunsch planen"
                >
                  📅
                </button>
                <button
                  className="remove-btn"
                  style={{ margin: 0 }}
                  onClick={() => markDone(item.id)}
                  aria-label="Als erledigt markieren"
                >
                  ✕
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {showForm ? (
        <form className="form form--sheet" onSubmit={handleAdd} ref={formRef}>
          <input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} required />
          <input placeholder="Ort (optional)" value={ort} onChange={(e) => setOrt(e.target.value)} />
          <input
            placeholder="Kulinarische Richtung (optional)"
            value={kueche}
            onChange={(e) => setKueche(e.target.value)}
          />
          <input placeholder="Notiz (optional)" value={notiz} onChange={(e) => setNotiz(e.target.value)} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
            <button type="button" className="text-link" onClick={() => setShowForm(false)}>
              Abbrechen
            </button>
            <button type="submit" className="btn btn--primary" style={{ padding: '10px 20px' }}>
              Hinzufügen
            </button>
          </div>
        </form>
      ) : (
        <button className="fab" onClick={() => setShowForm(true)} aria-label="Neuer Wunsch">
          +
        </button>
      )}

      <BottomNav />
    </div>
  )
}
