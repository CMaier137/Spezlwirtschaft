# Spezlwirtschaft

PWA zum Bewerten gemeinsamer Restaurantbesuche zu dritt — mit Rangliste, Wunschliste und Zahlungsstatistik.

**Stack:** React + Vite + TypeScript (PWA) · Cloudflare Pages Functions (API) · Cloudflare D1 (Datenbank)

## Lokal entwickeln

```bash
npm install
npm run dev
```

Das startet nur das Frontend (`http://localhost:5173`). Die `/api/*`-Endpunkte laufen dabei ins Leere, weil die Pages Functions einen eigenen lokalen Server brauchen. Um alles zusammen inkl. Datenbank lokal zu testen:

```bash
npm run db:migrate:local   # legt lokale D1-Datenbank an und befüllt sie
npm run build
npx wrangler pages dev dist
```

Danach ist die App komplett unter `http://localhost:8788` erreichbar.

## Deployment einrichten (einmalig)

### 1. Code auf GitHub bringen

Neues, leeres Repository auf github.com anlegen (z. B. `spezlwirtschaft`), dann über **"Add file" → "Upload files"** den kompletten Projektordner hineinziehen — **ohne** die Ordner `node_modules`, `dist` und `.wrangler` (die werden nicht gebraucht und sind über `.gitignore` sowieso ausgeschlossen, falls du stattdessen mit `git` arbeitest).

### 2. Cloudflare Pages mit dem Repo verbinden

Im Cloudflare-Dashboard: **Workers & Pages → Create → Pages → Connect to Git** → das gerade erstellte Repo auswählen.

Build-Einstellungen:
- Framework preset: `Vite`
- Build command: `npm run build`
- Build output directory: `dist`

Nach dem ersten Deploy ist die App unter einer `*.pages.dev`-URL erreichbar (eigene Domain kann man später in den Pages-Einstellungen ergänzen).

### 3. D1-Datenbank anlegen und verbinden

Im Cloudflare-Dashboard: **Workers & Pages → D1 → Create database** → Name `spezlwirtschaft-db`.

Dann im Pages-Projekt: **Settings → Functions → D1 database bindings** → Binding hinzufügen:
- Variable name: `DB`
- D1 database: `spezlwirtschaft-db`

### 4. Schema/Migration einspielen

Mit [wrangler](https://developers.cloudflare.com/workers/wrangler/) lokal eingeloggt (`npx wrangler login`):

```bash
npx wrangler d1 execute spezlwirtschaft-db --remote --file=./migrations/0001_init.sql
```

Das legt alle Tabellen an und trägt die drei Nutzer (Christian, Basti, Flo) ein. **Namen anpassen?** Einfach vor dem Ausführen die drei `INSERT`-Zeilen am Ende von `migrations/0001_init.sql` bearbeiten, oder danach direkt per SQL:

```bash
npx wrangler d1 execute spezlwirtschaft-db --remote --command "UPDATE users SET name = 'Neuer Name' WHERE id = 'u-basti'"
```

### 5. Neu deployen

Nach dem Hinzufügen der D1-Bindung muss einmal neu deployed werden, damit die Functions Zugriff darauf bekommen (im Dashboard unter **Deployments** → **Retry deployment**, oder einfach eine neue Datei hochladen/committen).

Danach ist die App unter der Pages-URL live und einsatzbereit — auf dem Handy öffnen und über den Browser zum Homescreen hinzufügen, dann verhält sie sich wie eine installierte App.

## Projektstruktur

```
src/                    React-Frontend (Screens, Komponenten, API-Client)
functions/api/          Cloudflare Pages Functions (Backend-Endpunkte)
migrations/             D1-Datenbankschema
public/icons/           PWA-Icons (Platzhalter — gerne durch eigene ersetzen)
wrangler.toml           Cloudflare-Konfiguration (D1-Bindung)
```

## API-Endpunkte

| Methode | Pfad | Zweck |
|---|---|---|
| GET | `/api/users` | Die 3 festen Nutzer |
| GET | `/api/restaurants?sort=&kueche=` | Rangliste, sortierbar/filterbar |
| POST | `/api/restaurants` | Neues Restaurant anlegen |
| GET | `/api/restaurants/:id` | Detailseite mit Score-Breakdown & Besuchen |
| POST | `/api/visits` | Neuen Besuch erfassen |
| GET | `/api/visits/:id` | Besuch inkl. abgegebener/fehlender Bewertungen |
| POST | `/api/ratings` | Bewertung abgeben (Upsert pro Nutzer & Besuch) |
| GET | `/api/wishlist` | Wunschliste (alle Einträge) |
| POST | `/api/wishlist` | Wunsch hinzufügen |
| PATCH | `/api/wishlist/:id` | Wunsch als erledigt markieren |
| GET | `/api/stats/payments` | Zahlungsstatistik pro Person |

## Bekannte Vereinfachungen (bewusst für den MVP)

- **Kein echtes Login**: Die Nutzerauswahl wird im `localStorage` des Geräts gemerkt, es gibt keinen Passwortschutz für die API. Für einen privaten Dreierkreis ausreichend; bei Bedarf lässt sich später ein einfacher Shared-Secret-Header ergänzen.
- **Platzhalter-Icons**: `public/icons/*.png` sind einfache generierte Icons — gerne durch eigene ersetzen (192×192 und 512×512 PNG).
- **Phase 2** (automatische Restaurantvorschläge, Push-Erinnerungen) ist bewusst noch nicht enthalten, siehe Konzeptdokument.
