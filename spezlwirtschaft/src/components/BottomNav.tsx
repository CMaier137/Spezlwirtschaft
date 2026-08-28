import { NavLink } from 'react-router-dom'

export default function BottomNav() {
  const itemClass = ({ isActive }: { isActive: boolean }) =>
    `bottom-nav__item ${isActive ? 'bottom-nav__item--active' : ''}`

  return (
    <nav className="bottom-nav">
      <NavLink to="/" end className={itemClass}>
        <BarsIcon />
        <span>Rangliste</span>
      </NavLink>
      <NavLink to="/wunschliste" className={itemClass}>
        <HeartIcon />
        <span>Wunsch</span>
      </NavLink>
      <NavLink to="/besuch/neu" className="bottom-nav__fab" aria-label="Neuer Besuch">
        <PlusIcon />
      </NavLink>
      <NavLink to="/zahlungen" className={itemClass}>
        <WalletIcon />
        <span>Zahlungen</span>
      </NavLink>
    </nav>
  )
}

function BarsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 20V12M12 20V4M20 20v-8" />
    </svg>
  )
}

function HeartIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20s-7-4.6-9.5-9C1 8 2.5 4.5 6 4.5c2 0 3.3 1.1 4 2.2.7-1.1 2-2.2 4-2.2 3.5 0 5 3.5 3.5 6.5C19 15.4 12 20 12 20z" />
    </svg>
  )
}

function WalletIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="6" width="18" height="13" rx="2" />
      <path d="M3 10h18" />
      <circle cx="16.5" cy="14" r="1" />
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}
