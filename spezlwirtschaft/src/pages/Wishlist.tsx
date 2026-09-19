import { useEffect, useState, type FormEvent } from 'react'
import { api } from '../api'
import { useUser } from '../context/UserContext'
import BottomNav from '../components/BottomNav'
import type { WishlistItem } from '../types'

export default function Wishlist() {
  const { currentUser } = useUser()
  const [items, setItems] = useState<WishlistItem[]>([])
  const [tab, setTab] = useState<'mine' | 'all'>('mine')
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [ort, setOrt] = useState('')
  const [kueche, setKueche] = useState('')
  const [notiz, setNotiz] = useState('')

  function reload() {
    api.getWishlist().then(setItems)
  }
  useEffect(reload, [])

  const visible = (tab === 'mine' ? items.filter((i) => i.vorgeschlagen_von === currentUser?.id) : items).filter(
    (i) => i.status === 'offen'
  )

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

  return (
    <div className="page">
      <div className="topbar">
        <div className="page-title">Wunschliste</div>
      </div>

      <div className="segmented">
        <button
          className={`segmented__option ${tab === 'mine' ? 'segmented__option--active' : ''}`}
          onClick={() => setTab('mine')}
        >
          Meine Liste
        </button>
        <button
          className={`segmented__option ${tab === 'all' ? 'segmented__option--active' : ''}`}
          onClick={() => setTab('all')}
        >
          Alle
        </button>
      </div>

      <div className="list">
        {visible.length === 0 && <div className="hint">Noch nichts auf der Liste.</div>}
        {visible.map((item) => (
          <div className="card wishlist-card" key={item.id}>
            <div>
              <div className="row-card__title">{item.name}</div>
              <div className="hint">{[item.ort, item.kueche].filter(Boolean).join(' · ')}</div>
              {item.notiz && <div className="comment">„{item.notiz}“</div>}
              <div className="hint hint--faint">vorgeschlagen von {item.vorgeschlagen_von_name}</div>
            </div>
            <button className="remove-btn" onClick={() => markDone(item.id)} aria-label="Als erledigt markieren">
              ✕
            </button>
          </div>
        ))}
      </div>

      {showForm ? (
        <form className="form form--sheet" onSubmit={handleAdd}>
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
