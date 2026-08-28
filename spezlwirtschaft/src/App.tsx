import type { ReactNode } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { UserProvider, useUser } from './context/UserContext'
import Login from './pages/Login'
import Ranking from './pages/Ranking'
import RestaurantDetail from './pages/RestaurantDetail'
import NewVisit from './pages/NewVisit'
import Rating from './pages/Rating'
import Wishlist from './pages/Wishlist'
import Payments from './pages/Payments'

function Gate({ children }: { children: ReactNode }) {
  const { currentUserId, loadingUsers } = useUser()
  if (loadingUsers) return <div className="page-center">Lädt …</div>
  if (!currentUserId) return <Login />
  return <>{children}</>
}

export default function App() {
  return (
    <UserProvider>
      <BrowserRouter>
        <Gate>
          <Routes>
            <Route path="/" element={<Ranking />} />
            <Route path="/restaurants/:id" element={<RestaurantDetail />} />
            <Route path="/besuch/neu" element={<NewVisit />} />
            <Route path="/besuch/:visitId/bewerten" element={<Rating />} />
            <Route path="/wunschliste" element={<Wishlist />} />
            <Route path="/zahlungen" element={<Payments />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Gate>
      </BrowserRouter>
    </UserProvider>
  )
}
