# ClassSync

Web-App für Schüler zum Teilen von Unterrichtsmaterial – Mitschriften, HA-Lösungen,
Lernzettel und Aufgabenblätter, organisiert nach Kursen und Stundenplan.

**Stack:** React 18 + Vite · Firebase (Firestore, Auth, Storage) · vite-plugin-pwa · Vercel

## Setup

### 1. Firebase-Projekt anlegen

1. Neues Projekt auf [console.firebase.google.com](https://console.firebase.google.com) erstellen
2. **Web-App hinzufügen** (Projekteinstellungen → Allgemein) und die Config-Werte kopieren
3. **Authentication** aktivieren → Anmeldemethode **E-Mail/Passwort** einschalten
4. **Firestore Database** erstellen (Produktionsmodus)
5. **Storage** aktivieren
6. Regeln veröffentlichen:
   - Firestore → Regeln → Inhalt von [`firestore.rules`](firestore.rules) einfügen → Veröffentlichen
   - Storage → Regeln → Inhalt von [`storage.rules`](storage.rules) einfügen → Veröffentlichen
7. **IAM** ([console.cloud.google.com/iam-admin](https://console.cloud.google.com/iam-admin)):
   dem Storage-Dienstkonto (`service-…@gcp-sa-firebasestorage.iam.gserviceaccount.com`)
   die Rolle **Cloud Datastore User** geben – nötig, weil die Storage-Regeln per
   `firestore.get()` die Klassenzugehörigkeit prüfen

### 2. Lokal starten

```bash
# Keys in .env.local eintragen (VITE_FIREBASE_*), dann:
npm install
npm run dev
```

Lokal läuft immer die App; die Landingpage ist unter `http://localhost:5173/?landing=1` erreichbar.

### 3. Deployment (Vercel)

- Repo auf GitHub pushen, in Vercel importieren (Framework: Vite)
- Die 6 `VITE_FIREBASE_*`-Variablen unter Settings → Environment Variables eintragen
- Domains: `classsync.de` (Landing) + `app.classsync.de` (App) – das Routing passiert
  per Hostname-Check in [`src/main.jsx`](src/main.jsx)
- `vercel.json` enthält bereits die SPA-Rewrite-Regel

## Architektur

- **Datenmodell:** Kurs-Mitgliedschaft liegt als `memberIds`-Array auf dem Kurs-Dokument
  (`/klassen/{id}/kurse/{id}`). Subcollections pro Kurs: `materialien`, `hausaufgaben`,
  `pruefungen`, `chat`. Admin-Status via `klassen.adminIds` (Multi-Admin).
- **Rechte:** komplett in `firestore.rules` abgebildet – Klassen-Admins, Kurs-Ersteller
  („Kurs-Admin") und Feld-Ausnahmen für `likes`, `doneBy`/`hiddenBy`, `memberIds`.
- **UI:** Sidebar-Workspace (Kurse immer sichtbar), KursPage mit Materialien als
  Hauptfläche, HA/Prüfungen/Chat als Tabs (breite Screens: rechte Spalte).
- **Styling:** Inline Styles + Design-Tokens in [`src/styles/theme.js`](src/styles/theme.js),
  Light/Dark Mode, keine externe CSS-Library.
