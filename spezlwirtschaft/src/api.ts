import type { User, RestaurantSummary, RestaurantDetail, WishlistItem, PaymentStats, VisitDetail } from './types'

const API_BASE = '/api'

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { 'content-type': 'application/json', ...(options.headers || {}) }
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `Anfrage fehlgeschlagen (${res.status})`)
  }
  if (res.status === 204) return null as T
  return res.json() as Promise<T>
}

export const api = {
  getUsers: () => request<User[]>('/users'),

  getRestaurants: (params: Record<string, string>) =>
    request<RestaurantSummary[]>(`/restaurants?${new URLSearchParams(params)}`),

  getRestaurant: (id: string) => request<RestaurantDetail>(`/restaurants/${id}`),

  createRestaurant: (data: { name: string; ort?: string; kueche?: string; created_by?: string }) =>
    request<{ id: string }>('/restaurants', { method: 'POST', body: JSON.stringify(data) }),

  createVisit: (data: { restaurant_id: string; datum: string; betrag: number | null; bezahlt_von: string | null }) =>
    request<{ id: string }>('/visits', { method: 'POST', body: JSON.stringify(data) }),

  getVisit: (id: string) => request<VisitDetail>(`/visits/${id}`),

  submitRating: (data: {
    visit_id?: string
    user_id?: string
    essen: number
    service: number
    ambiente: number
    preis_leistung: number
    kommentar?: string
  }) => request<{ ok: true }>('/ratings', { method: 'POST', body: JSON.stringify(data) }),

  getWishlist: () => request<WishlistItem[]>('/wishlist'),

  createWishlistItem: (data: { vorgeschlagen_von: string; name: string; ort?: string; kueche?: string; notiz?: string }) =>
    request<{ id: string }>('/wishlist', { method: 'POST', body: JSON.stringify(data) }),

  updateWishlistStatus: (id: string, status: 'offen' | 'erledigt') =>
    request<{ ok: true }>(`/wishlist/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }),

  getPaymentStats: () => request<PaymentStats>('/stats/payments')
}
