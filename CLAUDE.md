# ClassSync – Projektkontext für Claude

Web-App für Schüler zum Teilen von Unterrichtsmaterial (Mitschriften, HA-Lösungen,
Lernzettel, Aufgabenblätter), organisiert nach Kursen und Stundenplan.
**Vollständige Doku: [handoff.md](handoff.md) — bei nichttrivialen Aufgaben zuerst lesen.**

## Stack & Befehle
- React 18 + Vite · Firebase (Firestore/Auth/Storage) · react-router-dom 7 · lucide-react · vite-plugin-pwa
- Styling: **nur Inline-Styles + Design-Tokens** aus `src/styles/theme.js` (keine CSS-Library)
- `npm run dev` (Port 5173, Config in `.claude/launch.json`) · `npm run build`
- Deploy: `git push origin main` → Vercel (falls Git-Integration aktiv), sonst `vercel --prod`
- **Preview testen:** Branch pushen → `https://classsync-v2-git-<branch>-jerk-s-projects.vercel.app/?app=1`. ⚠️ Ohne `?app=1` zeigt die Preview die **Landingpage** (Host ≠ `app.*`) und deren Buttons führen in die **Produktion** — man testet dann unbemerkt die Live-Version.

## Infrastruktur
- **Firebase-Projekt: `classsync-v2`** (Keys in `.env.local`, nicht in Git)
- GitHub: `Jannihue10/classsync-v2` (öffentlich) · Vercel: `jerk-s-projects/classsync-v2`
- Domains: `classsync.de` (Landing) + `app.classsync.de` (App)

## Architektur-Kernpunkte
- **Hostname-Routing** (`src/main.jsx`): `app.*` oder localhost → App, sonst Landing. Landing lokal via `?landing=1`.
- **Multi-Klassen:** Klassen-Mitgliedschaft = **`users.klasseIds[]`** + **`users.activeKlasseId`** (aktive Klasse). Die App ist immer auf **eine aktive Klasse** skopiert (`KlasseProvider key={activeKlasseId}`); Wechsel über Sidebar-Dropdown/Profil. `MembershipsContext` beobachtet alle eigenen Klassen (Wechsler, Ban-Eviction, Migrations-Einladungen).
- **Kurs-Mitgliedschaft = `memberIds`-Array am Kurs-Doc** (nicht am User). Admin-Status via `klassen.adminIds`.
- **Schuljahres-Migration:** Admin lädt per `migration`-Feld an der Quellklasse alle Mitglieder in eine neue/andere Klasse ein; sie treten **selbst** bei (bleiben in der alten). Muster wie Ban: Selbstbedienung per Listener.
- Firestore-Struktur: `/klassen/{id}/kurse/{id}/{materialien|hausaufgaben|pruefungen|chat}` + `/klassen/{id}/sammlungen/{id}`.
- **Security Rules werden NICHT automatisch deployed** — `firestore.rules`/`storage.rules` von Hand in der Firebase Console veröffentlichen. `isMember` prüft `klasseId in me().klasseIds`.
- ⚠️ **Lösch-Kaskade-Falle:** Beim Kurs-/Klasse-Löschen müssen Admins auch Chat-/Fremd-Docs **und alle Sammlungen** lesen+löschen dürfen (`isKursAdmin`/`isKlassenAdmin` in den Rules; Sammlungen-**read** erlaubt Klassen-Admin explizit für die Kaskade). Kurs-/Klassen-Doc immer *zuletzt* löschen (Rules lesen es per `get()`). Kaskade wirft mit Stufen-Kontext (`stepError` in `klasseActions.js`).

## Designsprache (verbindlich — bei neuen Features beibehalten)
- **Slate-UI mit sparsamem Akzent** (Light `#3b6ea5`, Dark `#6d9bcf`). Keine Farbverläufe.
- **Keine Emoji in der UI.** Icons ausschließlich aus `lucide-react` (`strokeWidth 1.8`).
- Kurse/Fächer als **farbige Monogramme** (`components/ui/CourseAvatar.jsx`), nicht als Icons.
- Flache Hairline-Schatten, Radius 7/10/14, Fettschrift sparsam (700+ nur für echte Überschriften).
- **Größen bleiben feste px-Zahlen.** Die globale Vergrößerung läuft über `#root { zoom: var(--cs-scale) }` (Tablet automatisch 1.15x, im Profil einstellbar) — nicht über rem oder Komponenten-Props.
- ⚠️ **`vh`/`vw` nie roh verwenden** — sie lösen im gezoomten `#root` gegen den unskalierten Viewport auf und werden dann mitskaliert. Stattdessen `vhScaled()`/`vwScaled()` aus `theme.js`.
- ⚠️ **Safe-Area: absorbieren, nicht addieren.** Nicht `calc(16px + env(...))`, sondern `safePad(side, 16)` = `max(16px, inset)` — sonst ist der Abstand auf jedem Gerät um einen anderen Betrag zu groß. Helfer: `safeInset`/`safePad`/`safeExtra` in `theme.js`. Gilt für **jede** neue Vollbild-Fläche (Overlays, Slide-overs, Modals). Details: handoff.md §9 „UI-Skalierung & Safe-Area".

## Arbeitsweise
- Vollständig deutsche UI. Nach Änderungen: `npm run build` grün halten + im Browser prüfen.
- Zum Testen ggf. Wegwerf-Klasse anlegen und danach wieder löschen (echtes Firebase-Backend).
- Commit/Push nur auf Zuruf des Users.
