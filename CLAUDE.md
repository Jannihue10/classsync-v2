# ClassSync – Projektkontext für Claude

Web-App für Schüler zum Teilen von Unterrichtsmaterial (Mitschriften, HA-Lösungen,
Lernzettel, Aufgabenblätter), organisiert nach Kursen und Stundenplan.
**Vollständige Doku: [handoff.md](handoff.md) — bei nichttrivialen Aufgaben zuerst lesen.**

## Stack & Befehle
- React 18 + Vite · Firebase (Firestore/Auth/Storage) · react-router-dom 7 · lucide-react · vite-plugin-pwa
- Styling: **nur Inline-Styles + Design-Tokens** aus `src/styles/theme.js` (keine CSS-Library)
- `npm run dev` (Port 5173, Config in `.claude/launch.json`) · `npm run build`
- Deploy: `git push origin main` → Vercel (falls Git-Integration aktiv), sonst `vercel --prod`

## Infrastruktur
- **Firebase-Projekt: `classsync-v2`** (Keys in `.env.local`, nicht in Git)
- GitHub: `Jannihue10/classsync-v2` (öffentlich) · Vercel: `jerk-s-projects/classsync-v2`
- Domains: `classsync.de` (Landing) + `app.classsync.de` (App)

## Architektur-Kernpunkte
- **Hostname-Routing** (`src/main.jsx`): `app.*` oder localhost → App, sonst Landing. Landing lokal via `?landing=1`.
- **Kurs-Mitgliedschaft = `memberIds`-Array am Kurs-Doc** (nicht am User). Admin-Status via `klassen.adminIds`.
- Firestore-Struktur: `/klassen/{id}/kurse/{id}/{materialien|hausaufgaben|pruefungen|chat}`.
- **Security Rules werden NICHT automatisch deployed** — `firestore.rules`/`storage.rules` von Hand in der Firebase Console veröffentlichen.
- ⚠️ **Lösch-Kaskade-Falle:** Beim Kurs-/Klasse-Löschen müssen Admins auch Chat-/Fremd-Docs löschen dürfen (`isKursAdmin`-Helper in den Rules). Kurs-/Klassen-Doc immer *zuletzt* löschen (Rules lesen es per `get()`).

## Designsprache (verbindlich — bei neuen Features beibehalten)
- **Slate-UI mit sparsamem Akzent** (Light `#3b6ea5`, Dark `#6d9bcf`). Keine Farbverläufe.
- **Keine Emoji in der UI.** Icons ausschließlich aus `lucide-react` (`strokeWidth 1.8`).
- Kurse/Fächer als **farbige Monogramme** (`components/ui/CourseAvatar.jsx`), nicht als Icons.
- Flache Hairline-Schatten, Radius 7/10/14, Fettschrift sparsam (700+ nur für echte Überschriften).
- iOS-PWA: Safe-Area-Insets (`env(safe-area-inset-*)`) an obersten Flächen beachten.

## Arbeitsweise
- Vollständig deutsche UI. Nach Änderungen: `npm run build` grün halten + im Browser prüfen.
- Zum Testen ggf. Wegwerf-Klasse anlegen und danach wieder löschen (echtes Firebase-Backend).
- Commit/Push nur auf Zuruf des Users.
