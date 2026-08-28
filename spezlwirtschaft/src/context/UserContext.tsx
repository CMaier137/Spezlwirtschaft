import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { api } from '../api'
import type { User } from '../types'

const STORAGE_KEY = 'spezlwirtschaft.userId'

interface UserContextValue {
  users: User[]
  currentUserId: string | null
  currentUser: User | null
  loadingUsers: boolean
  chooseUser: (id: string) => void
}

const UserContext = createContext<UserContextValue | null>(null)

export function UserProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<User[]>([])
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(() => localStorage.getItem(STORAGE_KEY))

  useEffect(() => {
    api
      .getUsers()
      .then(setUsers)
      .finally(() => setLoadingUsers(false))
  }, [])

  const chooseUser = (id: string) => {
    localStorage.setItem(STORAGE_KEY, id)
    setCurrentUserId(id)
  }

  const currentUser = users.find((u) => u.id === currentUserId) ?? null

  return (
    <UserContext.Provider value={{ users, currentUserId, currentUser, loadingUsers, chooseUser }}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  const ctx = useContext(UserContext)
  if (!ctx) throw new Error('useUser muss innerhalb von UserProvider verwendet werden')
  return ctx
}
