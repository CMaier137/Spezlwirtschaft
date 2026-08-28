import { useUser } from '../context/UserContext'

export default function Login() {
  const { users, loadingUsers, chooseUser } = useUser()

  return (
    <div className="page--center page-center">
      <div className="brand brand--xl">Spezlwirtschaft</div>
      <div className="hint" style={{ marginBottom: 40 }}>Restaurant-Rangliste für uns drei</div>

      <div className="hint" style={{ marginBottom: 12 }}>Wer bist du?</div>
      <div className="user-list">
        {loadingUsers && <div className="hint">Lädt …</div>}
        {!loadingUsers && users.length === 0 && (
          <div className="hint">Keine Nutzer gefunden — ist die Datenbank-Migration gelaufen?</div>
        )}
        {users.map((u) => (
          <button className="user-card" key={u.id} onClick={() => chooseUser(u.id)}>
            <div className="avatar">{u.name[0]}</div>
            <div className="user-card__name">{u.name}</div>
          </button>
        ))}
      </div>

      <div className="hint hint--faint" style={{ marginTop: 40 }}>Keine Anmeldung nötig — einfach Namen wählen</div>
    </div>
  )
}
