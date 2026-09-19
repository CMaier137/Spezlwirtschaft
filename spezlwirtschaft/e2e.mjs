// tests/e2e.mjs — E2E-Testsuite für Spezlwirtschaft.
// Ausführen mit: npm run test:e2e
//
// Läuft komplett lokal ohne echtes Cloudflare-Konto: baut das Projekt,
// legt eine frische lokale D1-Testdatenbank an, startet die Pages Functions
// über `wrangler pages dev` und schickt echte HTTP-Requests dagegen.
// ACHTUNG: setzt den lokalen `.wrangler/state`-Ordner zurück — für isolierte,
// wiederholbare Testläufe. Betrifft nur lokale Testdaten, nicht die echte
// (remote) D1-Datenbank in Cloudflare.

import { execSync, spawn } from 'node:child_process'
import { existsSync, rmSync, readFileSync } from 'node:fs'
import { setTimeout as sleep } from 'node:timers/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const PORT = 8799
const BASE = `http://localhost:${PORT}`

let passed = 0
let failed = 0
let total = 0
const failures = []

function test(id, name, fn) {
  total++
  try {
    fn()
    console.log(`  ✓ [${id}] ${name}`)
    passed++
  } catch (e) {
    console.log(`  ✗ [${id}] ${name}\n      → ${e.message}`)
    failed++
    failures.push({ id, name, error: e.message })
  }
}

async function testAsync(id, name, fn) {
  total++
  try {
    await fn()
    console.log(`  ✓ [${id}] ${name}`)
    passed++
  } catch (e) {
    console.log(`  ✗ [${id}] ${name}\n      → ${e.message}`)
    failed++
    failures.push({ id, name, error: e.message })
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg || 'Assertion failed')
}
function assertEqual(a, b, msg) {
  if (a !== b) throw new Error(msg || `Erwartet ${JSON.stringify(b)}, bekommen ${JSON.stringify(a)}`)
}
function assertClose(a, b, eps, msg) {
  if (typeof a !== 'number' || Math.abs(a - b) > eps) {
    throw new Error(msg || `Erwartet ~${b}, bekommen ${a}`)
  }
}

async function api(method, pathName, body) {
  const res = await fetch(`${BASE}${pathName}`, {
    method,
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined
  })
  let data = null
  try {
    data = await res.json()
  } catch {
    /* kein JSON-Body, ok */
  }
  return { status: res.status, data }
}

let server = null
function cleanup() {
  if (server && server.pid) {
    // wrangler startet intern weitere Prozesse (esbuild, workerd) — die
    // eigene Prozessgruppe killen, sonst bleiben Kindprozesse hängen und
    // das Skript beendet sich nie von selbst.
    try {
      process.kill(-server.pid, 'SIGKILL')
    } catch {
      try {
        server.kill('SIGKILL')
      } catch {
        /* Prozess war schon weg, ok */
      }
    }
    server = null
  }
}
process.on('exit', cleanup)

async function main() {
  // ═══════════════════════════════════════════════════════════
  // SX-01/02 MÜSSEN ZUERST LAUFEN: Build & Typecheck, bricht bei Fehler ab
  // ═══════════════════════════════════════════════════════════
  console.log('\n🔧 SX Build & Typecheck')
  try {
    execSync('npm run build', { cwd: ROOT, stdio: 'pipe' })
    console.log('  ✓ [SX-01] Frontend-Build (tsc + vite) erfolgreich')
  } catch (e) {
    console.error('  ✗ [SX-01] Frontend-Build fehlgeschlagen:')
    console.error(e.stdout?.toString() || e.stderr?.toString())
    console.error('\nAbgebrochen — kein Sinn weiterzutesten mit kaputtem Build.')
    process.exit(1)
  }
  try {
    execSync('npx tsc -p functions/tsconfig.json --noEmit', { cwd: ROOT, stdio: 'pipe' })
    console.log('  ✓ [SX-02] Functions-Typecheck erfolgreich\n')
  } catch (e) {
    console.error('  ✗ [SX-02] Functions-Typecheck fehlgeschlagen:')
    console.error(e.stdout?.toString() || e.stderr?.toString())
    console.error('\nAbgebrochen — kein Sinn weiterzutesten mit kaputten Functions.')
    process.exit(1)
  }

  // ═══════════════════════════════════════════════════════════
  // Setup: frische lokale D1-Testdatenbank + Dev-Server
  // ═══════════════════════════════════════════════════════════
  const stateDir = path.join(ROOT, '.wrangler', 'state')
  if (existsSync(stateDir)) rmSync(stateDir, { recursive: true, force: true })

  execSync('npx wrangler d1 execute spezlwirtschaft-db --local --file=./migrations/0001_init.sql', {
    cwd: ROOT,
    stdio: 'pipe'
  })

  server = spawn('npx', ['wrangler', 'pages', 'dev', 'dist', '--port', String(PORT)], {
    cwd: ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: true // eigene Prozessgruppe, damit cleanup() alle Kindprozesse mit-killt
  })
  let serverReady = false
  let serverLog = ''
  server.stdout.on('data', (d) => {
    serverLog += d.toString()
    if (d.toString().includes('Ready on')) serverReady = true
  })
  server.stderr.on('data', (d) => {
    serverLog += d.toString()
  })

  for (let i = 0; i < 40 && !serverReady; i++) await sleep(500)
  if (!serverReady) {
    console.error('✗ Dev-Server ist nicht rechtzeitig gestartet. Log:\n' + serverLog)
    process.exit(1)
  }
  await sleep(500)

  // ═══════════════════════════════════════════════════════════
  console.log('📍 API-01 Grunddaten & Restaurants')

  let users
  await testAsync('API-01', 'GET /api/users liefert genau die 3 seed-Nutzer', async () => {
    const { status, data } = await api('GET', '/api/users')
    assertEqual(status, 200)
    assertEqual(data.length, 3)
    users = data
  })

  let restaurantId
  await testAsync('API-02', 'POST /api/restaurants legt ein Restaurant an', async () => {
    const { status, data } = await api('POST', '/api/restaurants', {
      name: 'Test-Trattoria',
      ort: 'Musterstadt',
      kueche: 'Italienisch',
      created_by: users[0].id
    })
    assertEqual(status, 201)
    assert(!!data.id, 'keine id zurückgegeben')
    restaurantId = data.id
  })

  await testAsync('API-03', 'Neues Restaurant erscheint in der Rangliste ohne Score (0 Besuche)', async () => {
    const { data } = await api('GET', '/api/restaurants?sort=overall&kueche=Alle')
    const r = data.find((x) => x.id === restaurantId)
    assert(!!r, 'Restaurant nicht in der Liste gefunden')
    assertEqual(r.visit_count, 0)
    assertEqual(r.overall_score, null)
  })

  await testAsync('API-04', 'POST /api/restaurants ohne Namen wird abgelehnt (400)', async () => {
    const { status } = await api('POST', '/api/restaurants', { created_by: users[0].id })
    assertEqual(status, 400)
  })

  let visitId
  await testAsync('API-05', 'POST /api/visits legt einen Besuch an', async () => {
    const { status, data } = await api('POST', '/api/visits', {
      restaurant_id: restaurantId,
      datum: '2026-07-12',
      betrag: 100,
      bezahlt_von: users[0].id
    })
    assertEqual(status, 201)
    visitId = data.id
  })

  await testAsync('API-06', 'Vor jeder Bewertung sind alle 3 Nutzer "pending"', async () => {
    const { data } = await api('GET', `/api/visits/${visitId}`)
    assertEqual(data.pending_users.length, 3)
    assertEqual(data.ratings.length, 0)
  })

  await testAsync('API-07', 'Erste Bewertung reduziert "pending" auf 2', async () => {
    const { status } = await api('POST', '/api/ratings', {
      visit_id: visitId,
      user_id: users[0].id,
      essen: 5,
      service: 4,
      ambiente: 5,
      preis_leistung: 4,
      kommentar: 'Top!'
    })
    assertEqual(status, 201)
    const { data } = await api('GET', `/api/visits/${visitId}`)
    assertEqual(data.pending_users.length, 2)
  })

  await testAsync('API-08', 'Rating außerhalb von 1–5 wird abgelehnt (400)', async () => {
    const { status } = await api('POST', '/api/ratings', {
      visit_id: visitId,
      user_id: users[1].id,
      essen: 6,
      service: 4,
      ambiente: 5,
      preis_leistung: 4
    })
    assertEqual(status, 400)
  })

  await testAsync('API-09', 'Zweite Bewertung reduziert "pending" auf 1 (den dritten Nutzer)', async () => {
    await api('POST', '/api/ratings', {
      visit_id: visitId,
      user_id: users[1].id,
      essen: 3,
      service: 5,
      ambiente: 3,
      preis_leistung: 4
    })
    const { data } = await api('GET', `/api/visits/${visitId}`)
    assertEqual(data.pending_users.length, 1)
    assertEqual(data.pending_users[0].id, users[2].id)
  })

  console.log('\n📍 SCORE Score-Berechnung (dokumentierte Formel aus dem Konzept)')

  await testAsync('SCORE-01', 'Restaurant-Score = Ø der Rating-Scores aller Bewertungen dieses Besuchs', async () => {
    const { data } = await api('GET', `/api/restaurants/${restaurantId}`)
    // Nutzer 1: (5+4+5+4)/4 = 4.5   Nutzer 2: (3+5+3+4)/4 = 3.75   → Ø 4.125
    assertClose(data.overall_score, 4.125, 0.001)
    assertClose(data.avg_essen, 4.0, 0.001) // (5+3)/2
    assertClose(data.avg_service, 4.5, 0.001) // (4+5)/2
    assertClose(data.avg_ambiente, 4.0, 0.001) // (5+3)/2
    assertClose(data.avg_preis_leistung, 4.0, 0.001) // (4+4)/2
  })

  await testAsync('SCORE-02', 'Kommentar ist in der Detailansicht namentlich zugeordnet', async () => {
    const { data } = await api('GET', `/api/restaurants/${restaurantId}`)
    const visit = data.visits.find((v) => v.id === visitId)
    const commented = visit.ratings.find((r) => r.kommentar === 'Top!')
    assert(!!commented, 'Kommentar nicht gefunden')
    assertEqual(commented.user_name, users[0].name)
  })

  await testAsync('SCORE-03', 'Erneute Bewertung desselben Nutzers aktualisiert statt zu duplizieren (Upsert)', async () => {
    await api('POST', '/api/ratings', {
      visit_id: visitId,
      user_id: users[0].id,
      essen: 1,
      service: 1,
      ambiente: 1,
      preis_leistung: 1
    })
    const { data } = await api('GET', `/api/visits/${visitId}`)
    const own = data.ratings.filter((r) => r.user_id === users[0].id)
    assertEqual(own.length, 1, 'Es dürfen nicht zwei Bewertungen für denselben Nutzer/Besuch existieren')
    assertEqual(own[0].essen, 1)
  })

  console.log('\n📍 SORT Sortierung & Filter')

  let restaurant2Id
  await testAsync('SORT-01', 'Zweites Restaurant mit anderem Score-Profil anlegen', async () => {
    const created = await api('POST', '/api/restaurants', {
      name: 'Test-Curry-Palace',
      ort: 'Musterstadt',
      kueche: 'Indisch',
      created_by: users[0].id
    })
    restaurant2Id = created.data.id
    const visit = await api('POST', '/api/visits', {
      restaurant_id: restaurant2Id,
      datum: '2026-07-13',
      betrag: 50,
      bezahlt_von: users[1].id
    })
    // Essen top bewertet, aber Service/Ambiente/Preis-Leistung schlecht
    // → Gesamt-Score niedriger als Essen-Score.
    await api('POST', '/api/ratings', {
      visit_id: visit.data.id,
      user_id: users[0].id,
      essen: 5,
      service: 1,
      ambiente: 1,
      preis_leistung: 1
    })
  })

  await testAsync('SORT-02', 'sort=essen bringt Curry-Palace vor die Trattoria', async () => {
    const { data } = await api('GET', '/api/restaurants?sort=essen&kueche=Alle')
    const idx = (id) => data.findIndex((r) => r.id === id)
    assert(idx(restaurant2Id) < idx(restaurantId), 'Bei Essen-Sortierung sollte Curry-Palace vorne liegen')
  })

  await testAsync('SORT-03', 'sort=overall bringt die Trattoria vor Curry-Palace', async () => {
    const { data } = await api('GET', '/api/restaurants?sort=overall&kueche=Alle')
    const idx = (id) => data.findIndex((r) => r.id === id)
    assert(idx(restaurantId) < idx(restaurant2Id), 'Bei Gesamt-Sortierung sollte die Trattoria vorne liegen')
  })

  await testAsync('SORT-04', 'Küchenfilter zeigt nur passende Restaurants', async () => {
    const { data } = await api('GET', '/api/restaurants?sort=overall&kueche=Indisch')
    assert(
      data.every((r) => r.kueche === 'Indisch'),
      'Filter hat auch andere Küchen durchgelassen'
    )
    assert(
      data.some((r) => r.id === restaurant2Id),
      'Curry-Palace fehlt im gefilterten Ergebnis'
    )
  })

  await testAsync('NF-01', 'Unbekanntes Restaurant liefert 404', async () => {
    const { status } = await api('GET', '/api/restaurants/does-not-exist')
    assertEqual(status, 404)
  })

  console.log('\n📍 WISH Wunschliste')

  let wishId
  await testAsync('WISH-01', 'Wunsch anlegen', async () => {
    const { status, data } = await api('POST', '/api/wishlist', {
      vorgeschlagen_von: users[0].id,
      name: 'Ramen-Ya',
      ort: 'Musterstadt',
      kueche: 'Asiatisch',
      notiz: 'Testeintrag'
    })
    assertEqual(status, 201)
    wishId = data.id
  })

  await testAsync('WISH-02', 'Wunsch erscheint mit Status "offen" und Namen des Vorschlagenden', async () => {
    const { data } = await api('GET', '/api/wishlist')
    const item = data.find((w) => w.id === wishId)
    assert(!!item, 'Wunsch nicht gefunden')
    assertEqual(item.status, 'offen')
    assertEqual(item.vorgeschlagen_von_name, users[0].name)
  })

  await testAsync('WISH-03', 'Wunsch als erledigt markieren (PATCH)', async () => {
    const { status } = await api('PATCH', `/api/wishlist/${wishId}`, { status: 'erledigt' })
    assertEqual(status, 200)
    const { data } = await api('GET', '/api/wishlist')
    assertEqual(data.find((w) => w.id === wishId).status, 'erledigt')
  })

  await testAsync('WISH-04', 'Ungültiger Status wird abgelehnt (400)', async () => {
    const { status } = await api('PATCH', `/api/wishlist/${wishId}`, { status: 'quatsch' })
    assertEqual(status, 400)
  })

  console.log('\n📍 PAY Zahlungsstatistik')

  await testAsync('PAY-01', 'Zahlungsstatistik zählt Anzahl & Summe korrekt pro Person', async () => {
    const { data } = await api('GET', '/api/stats/payments')
    const u0 = data.per_user.find((u) => u.id === users[0].id) // hat Besuch 1 bezahlt (100)
    const u1 = data.per_user.find((u) => u.id === users[1].id) // hat Besuch 2 bezahlt (50)
    assertEqual(u0.count, 1)
    assertClose(u0.total, 100, 0.001)
    assertEqual(u1.count, 1)
    assertClose(u1.total, 50, 0.001)
  })

  await testAsync('PAY-02', '"Zuletzt bezahlt" zeigt den Zahler des jüngsten Besuchs', async () => {
    const { data } = await api('GET', '/api/stats/payments')
    assertEqual(data.last_paid.name, users[1].name) // Besuch am 13.07. ist jünger als 12.07.
  })

  await testAsync('PAY-03', '"Nächstes Mal dran" schlägt den Nutzer mit den wenigsten Zahlungen vor', async () => {
    const { data } = await api('GET', '/api/stats/payments')
    assertEqual(data.next_up.id, users[2].id) // hat noch nie bezahlt
  })

  console.log('\n📍 BUILD PWA-Build-Ausgabe')

  test('BUILD-01', 'dist/manifest.webmanifest wurde erzeugt und enthält den App-Namen', () => {
    const manifestPath = path.join(ROOT, 'dist', 'manifest.webmanifest')
    assert(existsSync(manifestPath), 'manifest.webmanifest fehlt im Build-Output')
    const content = readFileSync(manifestPath, 'utf8')
    assert(content.includes('Spezlwirtschaft'), 'App-Name fehlt im Manifest')
  })

  // ═══════════════════════════════════════════════════════════
  cleanup()
  console.log(`\n${'═'.repeat(60)}`)
  if (failed === 0) {
    console.log(`🎉  ${passed} bestanden  |  ${failed} fehlgeschlagen  |  ${total} gesamt`)
  } else {
    console.log(`⚠️  ${passed} bestanden  |  ${failed} fehlgeschlagen  |  ${total} gesamt`)
    console.log('\nFehlgeschlagene Tests:')
    failures.forEach((r) => console.log(`  ✗ [${r.id}] ${r.name}\n    ${r.error}`))
  }
  // Explizit beenden statt auf natürliches Event-Loop-Ende zu warten — die
  // gepipten stdio-Streams des (bereits gekillten) Dev-Servers können den
  // Prozess sonst offen halten.
  process.exit(failed === 0 ? 0 : 1)
}

main().catch((e) => {
  console.error('Unerwarteter Fehler in der Testsuite:', e)
  cleanup()
  process.exit(1)
})
