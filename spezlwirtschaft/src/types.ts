export interface User {
  id: string
  name: string
}

export interface RestaurantSummary {
  id: string
  name: string
  ort: string | null
  kueche: string | null
  visit_count: number
  overall_score: number | null
  avg_essen: number | null
  avg_service: number | null
  avg_ambiente: number | null
  avg_preis_leistung: number | null
}

export interface VisitRating {
  visit_id: string
  user_name: string
  essen: number
  service: number
  ambiente: number
  preis_leistung: number
  kommentar: string | null
}

export interface RestaurantVisit {
  id: string
  datum: string
  betrag: number | null
  bezahlt_von_name: string | null
  avg: number | null
  ratings: VisitRating[]
}

export interface RestaurantDetail extends RestaurantSummary {
  visits: RestaurantVisit[]
}

export interface WishlistItem {
  id: string
  name: string
  ort: string | null
  kueche: string | null
  notiz: string | null
  status: 'offen' | 'erledigt'
  created_at: string
  vorgeschlagen_von: string
  vorgeschlagen_von_name: string
}

export interface PaymentStatsUser {
  id: string
  name: string
  count: number
  total: number
}

export interface PaymentStats {
  per_user: PaymentStatsUser[]
  last_paid: { name: string; datum: string } | null
  next_up: PaymentStatsUser | null
}

export interface VisitDetail {
  id: string
  datum: string
  restaurant_id: string
  restaurant_name: string
  ratings: { user_id: string; essen: number; service: number; ambiente: number; preis_leistung: number; kommentar: string | null }[]
  pending_users: User[]
}
