import { Env, json } from '../_shared'

// GET /api/stats/payments — wer hat wie oft/wie viel bezahlt, plus wer zuletzt
// und wer rein rechnerisch als Nächstes dran wäre (wenigste Zahlungen, dann
// niedrigste Summe als Tie-Breaker).
export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const { results: perUser } = await env.DB.prepare(
    `SELECT u.id, u.name,
            COUNT(v.id) AS count,
            COALESCE(SUM(v.betrag), 0) AS total
     FROM users u
     LEFT JOIN visits v ON v.bezahlt_von = u.id
     GROUP BY u.id
     ORDER BY u.sort_order`
  ).all<{ id: string; name: string; count: number; total: number }>()

  const lastPaid = await env.DB.prepare(
    `SELECT u.name, v.datum
     FROM visits v JOIN users u ON u.id = v.bezahlt_von
     WHERE v.bezahlt_von IS NOT NULL
     ORDER BY v.datum DESC LIMIT 1`
  ).first<{ name: string; datum: string }>()

  const nextUp = [...perUser].sort((a, b) => a.count - b.count || a.total - b.total)[0] ?? null

  return json({ per_user: perUser, last_paid: lastPaid, next_up: nextUp })
}
