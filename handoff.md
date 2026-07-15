# ClassSync – Vollständiges Handoff-Dokument (v2 / „Fable"-Rebuild)
*Zuletzt aktualisiert: 15. Juli 2026*

> Dieses Projekt ist ein **kompletter Neubau** der ursprünglichen ClassSync-App
> (alter Prototyp: `C:\Users\janni\classsync`). Gleicher Tech-Stack, neues
> UI/UX (Sidebar-Workspace), neues Firestore-Schema, frisches Firebase-Projekt.
> Der alte Prototyp und dessen Firebase-Projekt sind unabhängig und werden
> nicht mehr weiterentwickelt.

---

## 1. Projektübersicht

**ClassSync** ist eine Web-App für Schüler zum Teilen von Unterrichtsmaterial. Schüler können Mitschriften, Hausaufgaben-Lösungen, Lernzettel und Aufgabenblätter hochladen und mit ihrer Klasse teilen – organisiert nach Kursen und Stundenplan.

- **Zielgruppe:** Schüler weiterführender Schulen (Sek I & II), primär Deutschland
- **Plattform:** Web-App, optimiert für iPad/Desktop, responsive bis Smartphone. PWA-fähig
- **Sprache:** UI vollständig Deutsch
- **Domains:** `classsync.de` (Landingpage), `app.classsync.de` (die App)
- **Status:** ✅ Live und produktionsbereit. End-to-End getestet (2 Accounts, komplette Rechte-Matrix, Echtzeit-Sync, Storage-Upload, Lösch-Kaskade)
- **Projektordner:** `C:\Users\janni\ClassSync Fable`
- **Hauptfokus des Designs:** Kursinhalte/Materialien – die Sidebar zeigt immer alle eigenen Kurse, ein Klick öffnet den Kurs mit dem Material-Grid als primäre Fläche

---

## 2. Infrastruktur & Accounts

| Dienst | Details |
|---|---|
| **GitHub** | Repo `Jannihue10/classsync-v2` (öffentlich, Branch `main`) – https://github.com/Jannihue10/classsync-v2 – Account: `Jannihue10`, `gh` CLI installiert & eingeloggt |
| **Vercel** | Projekt `jerk-s-projects/classsync-v2` (Hobby-Plan) – Account `jannikhuenniger-1620`, `vercel` CLI installiert & eingeloggt, Ordner per `vercel link` verknüpft (`.vercel/` lokal, gitignored) |
| **Firebase** | Projekt **`classsync-v2`** – Auth (E-Mail/Passwort), Firestore, Storage (Bucket `classsync-v2.firebasestorage.app`). Keys in `.env.local` (nicht in Git) und als Vercel-Env-Vars (Production/Preview/Development) |
| **Domains** | `classsync.de` + `app.classsync.de` → Vercel-Projekt `classsync-v2` (vom alten Vercel-Projekt entfernt). DNS/Nameserver: IONOS → Vercel |

**Hinweise:**
- Deployment Protection („Vercel Authentication") wurde für das Projekt deaktiviert, sonst wäre die Seite nicht öffentlich.
- Die GitHub↔Vercel-Verknüpfung (Auto-Deploy bei Push) schlug per CLI fehl und muss ggf. im Vercel-Dashboard unter Settings → Git nachgeholt werden. Bis dahin: manuell mit `vercel --prod` deployen.
- In Firebase **Authentication** existieren noch Test-Accounts aus E2E-Tests, die gelöscht werden können: `classsync.test.a@testmail.de`, `classsync.test.b@testmail.de` (leere `users`-Dokumente) sowie `classsync.test.verify@testmail.de` (aus dem Verifizierungs-Test – unverifiziert, mit `users`-Doc; per Client-Rules nicht löschbar → in der Console entfernen).

---

## 3. Features

### Auth & Nutzer
- Registrierung mit **E-Mail, Passwort & Nickname** (E-Mail nie für andere sichtbar)
- Login via Firebase Authentication, **Passwort vergessen** (Firebase-Reset-Mail)
- **E-Mail-Verifizierung als harte Sperre:** Unverifizierte Nutzer (neu registriert **oder** bestehend nach nächstem Login) sehen den `VerifyEmail`-Screen und erhalten erst nach Klick auf den Bestätigungslink Zugriff auf die App. Standard-Verifizierungs-Mail des E-Mail/Passwort-Providers (kein Firebase-Extra-Setup). **Traffic-schonend:** `emailVerified` aus dem lokalen ID-Token (kein Request), Auto-Versand **einmal** pro Screen-Besuch, Status-Check nur on-demand per Button (`reload()`), „Erneut senden" mit 60 s-Cooldown; kein Polling. Screen bietet zusätzlich „Abmelden" (falsche Adresse → neu registrieren).
- Deutsche Fehlermeldungen via `authErrorText()` in `AuthContext.jsx`
- URL-Parameter `?register=true` öffnet direkt das Registrierungsformular
- Ohne Firebase-Keys in `.env.local` zeigt die App einen **Setup-Hinweis** statt zu crashen (`firebaseConfigured`-Check in `lib/firebase.js`)

### Klassen
- Jeder eingeloggte User kann eine Klasse erstellen → wird automatisch erster Admin
- **5-stelliger Zugangscode**, ohne verwechselbare Zeichen (kein 0/O/1/I), Generator in `lib/klasseActions.js`
- Beitritt per Code → **Kurswahlmodal öffnet automatisch** (sessionStorage-Flag `classsync_showKurswahl`)
- **Multi-Admin** über `klassen.adminIds` (Array) – Admins können promoten/degradieren, letzter Admin ist geschützt (UI zeigt „letzter Admin" statt Button)
- **Mitglieder-Moderation (Klassenebene):** Klassen-Admins können Mitglieder **sperren** (Ban) – der Betroffene fliegt aus allen Kursen und der Klasse und kann mit dem Code **nicht** wieder beitreten, bis ein Admin ihn entsperrt. Umgesetzt über `klassen.bannedIds` (Client wirft sich per Listener selbst raus, s. §9). Gesperrte werden in der Mitgliederliste **ausgegraut** mit „Gesperrt"-Tag angezeigt, plus eigene **„Gesperrt"-Sektion** zum Entsperren. Admins können nicht direkt gebannt werden (erst degradieren).
- **Klasse selbst verlassen:** Jedes Mitglied kann die Klasse eigenständig über das Profil verlassen (aus allen Kursen raus + `klasseId` genullt). Der **letzte Admin** ist geschützt (muss erst Rolle übertragen oder Klasse löschen).
- Klasse löschen (nur Klassen-Admin): **Kaskade** löscht alle Kurse inkl. Subcollections und Storage-Dateien; Mitglieder werden über den Klassen-Listener automatisch ins Onboarding geworfen (`klasseId` wird am User-Doc genullt)

### Kurse
- **Jedes Klassenmitglied** kann Kurse erstellen → wird Kurs-Admin (`erstellerId`) und einziges Startmitglied
- `KursFormModal` (Erstellen + Bearbeiten in einem): Name, Lehrer, Raum, mehrere Zeiten (Tag + Start + Ende), Farbe (12 Swatches + freier Farbwähler). Kein Icon-Feld – Kurse werden überall als **farbiges Monogramm** dargestellt (`CourseAvatar`: Anfangsbuchstabe in Kursfarbe)
- **18 Fächervorlagen** (Dropdown) setzen Name + Farbe vor
- Kurs-Admin bearbeitet/löscht eigenen Kurs, Klassen-Admin alle
- **Kurs-Mitgliedschaft = `memberIds`-Array am Kurs-Doc** (Kernänderung ggü. altem Schema, s. §6)
- **Mitgliederliste je Kurs:** „Mitglieder"-Button im Kurs-Header öffnet `KursMitgliederModal` – zeigt alle Kursmitglieder (Ersteller mit Badge). Kurs-/Klassen-Admins können einzelne Mitglieder aus dem Kurs **entfernen** (`memberIds`-Diff, nicht den Ersteller/sich selbst)

### Kurswahl
- Toggle-Karten mit Suchleiste (Name + Lehrer) + „Alle wählen" / „Alle abwählen"
- Speichert Diffs als `arrayUnion`/`arrayRemove` auf `memberIds`
- Erreichbar über Sidebar („⚙️ Kurse verwalten") und Profil; nach Code-Beitritt automatisch

### Materialien (Herzstück)
- Datei-Uploads (**PDF & Bilder**) bis **10 MB** via Firebase Storage, mit Fortschrittsbalken – oder **reine Notizen** ohne Datei (Text in `beschreibung`)
- **Typen:** Mitschrift, Aufgabenblatt, HA-Lösung, Lernzettel – mit Typ-Filterleiste (Pills mit Zählern) + Volltextsuche (Titel/Beschreibung/Autor)
- Material-Grid mit Karten: Bild-Thumbnail bzw. Typ-Icon, Typ-Tag, Autor, relative Zeit
- **Vorschau-Modal:** PDF im iframe, Bild als img, Notiz als Text; Download-Link, Löschen
- **⭐-Like/Danke-System** – Echtzeit, pro User togglebar
- `storagePath` + `dateiName` werden gespeichert (zuverlässiges Löschen + Anzeige)
- Titel wird beim Dateiwählen aus dem Dateinamen vorbefüllt

### Bibliothek & Sammlungen
- Eigener Menüpunkt **Bibliothek** (`/bibliothek`): führt **alle Materialien aller beigetretenen Kurse** kursübergreifend an einem Ort zusammen. Basiert auf `useAcrossKurse("materialien")`, Karten mit zusätzlichem **Kurs-Chip**.
- **Filter:** Kurs (farbige Chips, Mehrfachauswahl), Material-Typ (Pills), Dateityp (PDF/Bild/Notiz), Klassenmitglied/Autor (Dropdown) und **Sortierung** (Neueste/Älteste/Beliebteste) – plus Volltextsuche. Alle Filter kombinierbar.
- **Sammlungen:** persönliche Zusammenstellungen von Materialien (z. B. „alles für die Mathe-Prüfung"). Hinzufügen per **Lesezeichen-Button** an Material-Karte oder Vorschau-Modal; „Neue Sammlung" legt direkt an und bestückt sie.
- **Teilen/Kollaboration:** Sammlungen liegen auf Klassenebene mit `memberIds`-Muster (analog Kurse). Nur Ersteller drin = **privat**; weitere Klassenmitglieder = **geteilt/kollaborativ** (dürfen Materialien hinzufügen/entfernen). Ersteller verwaltet Freigabe, Umbenennen und Löschen; Kollaboratoren sehen die Sammlung unter „Mit mir geteilt" und können sie verlassen.
- Materialien werden als **Referenzen** gespeichert und beim Öffnen live aufgelöst (aktuelle Datei/Likes). Gelöschte oder nicht mehr zugängliche Materialien erscheinen als „nicht verfügbar", ohne die Sammlung zu beschädigen. Sammlung löschen entfernt **nur** die Zusammenstellung – die Materialien selbst bleiben in ihren Kursen.
- **Rückwärtskompatibel:** `MaterialCard`/`MaterialPreviewModal` bekamen optionale Props (`showKurs`, `onAddToSammlung`); die KursPage bleibt unverändert.

### Hausaufgaben
- **Inline-Eingabeleiste** oben (Text + Datum + Enter) – kein Modal nötig
- Klick auf HA → Detailmodal: Bearbeiten (Autor/Klassen-Admin), Fällig-Info, Erledigt-Statistik
- **Erledigt pro User:** `doneBy: uid[]` (Checkbox in Liste + Übersicht)
- **„Für mich löschen":** `hiddenBy: uid[]` – Auto-Cleanup löscht das Doc, wenn alle `memberIds` es versteckt haben **und** der Auslöser Autor oder Klassen-Admin ist (sonst bleibt es harmlos versteckt liegen – Rules-Design, s. §8)
- **„Für alle löschen":** Autor/Klassen-Admin
- Überfällige HAs rot, heute fällige gelb; Datum `DD.MM.YYYY` (intern `YYYY-MM-DD`)

### Prüfungen
- Inline-Eintragen (Titel + Datum, `min=heute`) von allen Mitgliedern
- **Live-Countdown** clientseitig via `calcTage()` – kein `tage`-Feld in Firestore
- Farbkodierung: rot ≤ 7 Tage, gelb ≤ 14, grün > 14 (`pruefungColor()` in `PruefungenSection.jsx`)
- Vergangene: ausgegraut „✓ vorbei" im Kurs, gefiltert in Übersicht/Kalender-Zukunft
- Löschen: Autor (via `autorId`) oder Klassen-Admin

### Chat
- Echtzeit-Chat pro Kurs, Bubbles (eigene rechts/farbig, fremde links mit Autor-Label), Auto-Scroll, Uhrzeit je Nachricht
- **Moderation (WhatsApp-Vorbild):** Tippen auf eine Bubble öffnet ein kleines Aktionsmenü (nur erlaubte Einträge).
  - **Bearbeiten:** nur der **Autor** seiner eigenen Nachrichten (Inline-Input, Enter speichert / Escape bricht ab). Bearbeitete Nachrichten tragen ein kleines Lucide-**Pencil-Icon** neben der Uhrzeit (`editedAt`-Feld).
  - **Löschen als Tombstone:** **Autor** (eigene), **Kurs-Admin** (alle im Kurs), **Klassen-Admin** (alle). Die Nachricht verschwindet nicht, sondern zeigt einen grauen Platzhalter „Diese Nachricht wurde gelöscht" (Ban-Icon); Löschen ist **technisch ein `update`** (`deleted:true` + Text geleert), **kein** Hard-Delete. Bestätigung über `ConfirmDialog`.
- Der echte Hard-`delete` einzelner Nachrichten bleibt (wie bisher) allein der **Lösch-Kaskade** vorbehalten.

### Benachrichtigungen
- 🔔 in der Sidebar (Desktop) bzw. TopBar (mobil) mit rotem Zähler-Badge
- Slide-over-Panel: neue Materialien **seit letztem „Alle gelesen"**, gruppiert nach Kurs, mit Typ-Tag, Autor, relativer Zeit; Klick navigiert zum Kurs
- `localStorage`-Key `classsync_lastSeen_{uid}`; Badge bleibt bis explizit „✓ Alle gelesen"
- **Eigene Uploads werden nicht gemeldet** (bewusste Verbesserung ggü. v1)

### Kalender (Stundenplan integriert)
- Ein einziger Menüpunkt **Kalender** mit Woche/Monat-Toggle (`KalenderPage`). Ein früher getrennter „Stundenplan"-Punkt wurde hier eingegliedert, weil die Wochenansicht ihn inhaltlich vollständig abdeckt; `/stundenplan` leitet per Redirect auf `/kalender` (alte Bookmarks).
  - *Woche:* echtes Datum (Mo–Fr der gewählten KW), Navigation ‹ Heute ›, KW-Anzeige, Heute-Highlight, Kursblöcke aus den `zeiten`, **Prüfungs-Pills unter dem Tages-Header**
  - *Monat:* Raster mit **KW-Spalte**, Nachbarmonatstage abgeblendet, Heute-Highlight, Prüfungs-Pills in Kursfarbe, **Legende** der Kurse mit Prüfungen im Monat
- Kursblöcke minutengenau via `WeekGrid.jsx`; Zeitraster dynamisch: früheste Startzeit (abgerundet, max. 8:00) bis späteste Endzeit + 30 min (min. 16:00); Tages-Header sticky, nur das Raster scrollt
- Datum-Parsing unterstützt `YYYY-MM-DD` **und** `DD.MM.YYYY` (`parseDatum()`)

### Übersicht (Startseite `/`)
- Dashboard mit drei Karten: **offene eigene HAs** (mit Abhak-Checkbox), **kommende Prüfungen** (sortiert nach Nähe, mit Countdown-Pill), **zuletzt geteilte Materialien** (neueste 8) – jeweils mit Kurs-Chip, Klick navigiert zum Kurs

### Profil
- Nickname ändern (live via Firestore-Listener), E-Mail-Anzeige (nur für einen selbst)
- Klassenname + Zugangscode mit **Kopieren-Button**
- **Mitgliederliste live** (Query `users where klasseId ==`), Admin-Badge 👑, Promote/Demote-Buttons für Klassen-Admins, Letzter-Admin-Schutz; **Entfernen/Sperren** je Mitglied + **„Gesperrt"-Sektion** zum Entsperren (s. §3 Klassen)
- **„Klasse verlassen"** (in der Klassen-Karte, letzter Admin gesperrt)
- Light/Dark-Toggle, Abmelden, Kurse verwalten, ⚠️ Gefahrenzone (Klasse löschen)

### Landingpage (`classsync.de`)
- `Landing.jsx`: Sticky Nav (Blur), Hero mit Gradient-Headline, Features-Grid (6), 3-Schritte-Sektion, CTA, Footer
- „Anmelden" → `https://app.classsync.de`, „Kostenlos starten" → `https://app.classsync.de?register=true`

### PWA
- `vite-plugin-pwa` (autoUpdate), `manifest` in `vite.config.js`: standalone, theme `#111111`, Icons 192/512
- Icons 16/32/180/192/512 in `/public/` (aus dem alten Projekt übernommen)

### Theming & Designsprache
- Kompletter **Light/Dark Mode** mit Design-Tokens in `src/styles/theme.js`; initial via `prefers-color-scheme`, gespeichert in `localStorage` (`classsync_theme`)
- Styling ausschließlich **Inline Styles + Tokens**, keine CSS-Library; globale Resets + Keyframes (`cs-spin`, `cs-fadein`, `cs-slideup`, `cs-slidein-left/right`) in `index.html`
- **Designsprache (bewusster „De-AI"-Feinschliff, Juli 2026):** Slate-Neutraltöne mit sparsamem Akzent (Light `#3b6ea5`, Dark `#6d9bcf`) statt des früheren Indigo `#6366f1`; **keine Farbverläufe**; flache Hairline-Schatten; Radius 7/10/14. **Keine Emoji in der UI** – Icons kommen aus `lucide-react` (Linien-Icons, `strokeWidth 1.8`), Kurse als `CourseAvatar`-Monogramme, Logo als flaches `LogoMark` (GraduationCap auf Akzent-Quadrat). Diese Prinzipien bei neuen Features beibehalten!

---

## 4. Tech Stack

| Bereich | Technologie |
|---|---|
| Frontend | React 18 (`^18.2.0`) + Vite (`^5.2.0`) |
| Routing | react-router-dom (`^7.15.1`) – Hostname-basiert: `app.*` → App, sonst Landing |
| Datenbank | Firebase Firestore (`firebase ^10.11.0`, Echtzeit-Listener überall) |
| Auth | Firebase Authentication (E-Mail/Passwort) |
| Datei-Upload | Firebase Storage (`uploadBytesResumable` mit Progress) |
| PWA | vite-plugin-pwa (`^1.3.0`) |
| Hosting | Vercel (SPA-Rewrite via `vercel.json`) |
| Styling | Inline Styles + Design-Tokens (kein CSS-Framework) |
| Icons | lucide-react (`^1.24`), tree-shakeable Linien-Icons |
| Fonts | Inter (Google Fonts, via `index.html`) |

---

## 5. Projektstruktur

```
ClassSync Fable/
├── index.html                      ← PWA-Meta, Inter, CSS-Reset + Keyframes
├── vite.config.js                  ← react() + VitePWA (Manifest)
├── vercel.json                     ← SPA-Rewrite: alle Pfade → /index.html
├── package.json
├── firestore.rules                 ← im Repo versioniert; deployen: Firebase Console → Firestore → Regeln
├── storage.rules                   ← dito (Console → Storage → Rules)
├── .env.local                      ← Firebase-Keys + VERCEL_OIDC_TOKEN (NICHT in Git)
├── .claude/launch.json             ← Dev-Server-Config für Claude Code (npm run dev, Port 5173)
├── public/                         ← favicon.svg, icon-16/32/180/192/512.png, icons.svg
└── src/
    ├── main.jsx                    ← Hostname-Switch: app.* ODER localhost → <App/>, sonst <Landing/>; ?landing=1 = Landing-Vorschau lokal
    ├── App.jsx                     ← Auth-Gate: SetupHinweis → Spinner → Login/Register → VerifyEmail (unverifiziert) → Onboarding → KlasseProvider → AppShell
    ├── lib/
    │   ├── firebase.js             ← Init aus import.meta.env; exportiert db, auth, storage, firebaseConfigured
    │   ├── dates.js                ← formatDatum, parseDatum, calcTage, tageLabel, relativeTime, formatUhrzeit, getKW, mondayOf, timeToMin, todayISO, dateToISO, WOCHENTAGE
    │   ├── faecher.js              ← FACH_VORLAGEN (18), MAT_TYPEN, MAT_COLORS, MAT_ICONS, DATEITYP_ICONS, KURS_FARBEN
    │   ├── klasseActions.js        ← generateCode, createKlasse, joinByCode (mit Ban-Pre-Check), promote/demoteAdmin, setKursMembership, banFromKlasse/unbanFromKlasse, leaveKlasse, deleteKurs, deleteKlasse (Kaskade inkl. Sammlungen)
    │   ├── useKursCollection.js    ← Hook: Live-Listener auf eine Kurs-Subcollection; tsMillis()
    │   ├── useAcrossKurse.js       ← Hook: eine Subcollection über ALLE eigenen Kurse (für Übersicht/Kalender/Bibliothek), Docs um kurs-Objekt ergänzt
    │   ├── useSammlungen.js        ← Hook: Live-Listener auf Sammlungen, in denen ich Mitglied bin; getrennt nach meine (owner) / geteilt
    │   ├── sammlungActions.js      ← create/rename/delete, addItem/removeItem, setSammlungMembers, leaveSammlung, itemFromMaterial
    │   └── useMediaQuery.js        ← useIsMobile (<768px), useIsWide (≥1200px)
    ├── context/
    │   ├── AuthContext.jsx         ← Firebase Auth + Live-Profil (onSnapshot users/{uid}); register/login/logout/resetPassword/updateProfile; emailVerified-State + sendVerification/reloadVerification (E-Mail-Verifizierung); authErrorText
    │   ├── ThemeContext.jsx        ← mode, toggle, t (Token-Objekt)
    │   ├── KlasseContext.jsx       ← Klassen-Doc-Listener (gelöscht ODER in bannedIds → klasseId nullen), Kurse-Listener; meineKurse, isKlassenAdmin, canManageKurs
    │   └── NotificationContext.jsx ← Material-Listener pro eigenem Kurs, lastSeen, Dedupe per ID, grouped, markAllRead
    ├── styles/theme.js             ← themes.light/dark (Tokens), radius, SIDEBAR_WIDTH, Breakpoints
    ├── components/
    │   ├── ui/UI.jsx               ← Btn, IconButton, Input, Modal, ModalHeader, CloseButton, Pill, Tag, Divider, SectionTitle, Spinner, Empty, Card, LogoMark
    │   ├── ui/CourseAvatar.jsx     ← farbiges Kurs-Monogramm (ersetzt Emoji-Icons)
    │   ├── ui/DateiIcon.jsx        ← PDF/Bild/Notiz-Icon (Lucide)
    │   ├── layout/
    │   │   ├── AppShell.jsx        ← Sidebar + Main, Routes (inkl. /bibliothek), Mobile-Drawer, öffnet Kurswahl-/KursForm-/Notification-Overlays
    │   │   ├── Sidebar.jsx         ← Logo/Klassenname, Nav (Übersicht, Bibliothek, Kalender), Kursliste (+ Kurs, Kurse verwalten), Profil/Glocke/Theme unten
    │   │   ├── AuthLayout.jsx      ← zentrierte Karte für Login/Register/Onboarding/Setup; exportiert Logo
    │   │   ├── PageHeader.jsx      ← Seitenkopf (Icon, Titel, Untertitel, Aktion)
    │   │   └── NotificationPanel.jsx ← Slide-over rechts, gruppierte neue Materialien, „Alle gelesen"
    │   ├── kurs/
    │   │   ├── MaterialGrid.jsx    ← Filter-Pills + Suche + Upload-Button + Karten-Grid + Modals
    │   │   ├── MaterialCard.jsx    ← Karte mit Thumbnail, Typ-Tag, Like, Löschen; optionale Props showKurs / onAddToSammlung (Bibliothek)
    │   │   ├── MaterialPreviewModal.jsx ← PDF-iframe / Bild / Notiz, Download, Like, Löschen; optionaler „Zu Sammlung"-Button
    │   │   ├── UploadModal.jsx     ← Typ-Auswahl, Titel, Beschreibung, Datei (MAX_MB=10), Progress
    │   │   ├── materialActions.js  ← toggleLike, deleteMaterial (Storage+Doc), canDeleteMaterial(mat, uid, isKlassenAdmin, kurs)
    │   │   ├── HASection.jsx       ← Inline-Eingabe, Liste, doneBy-Toggle; exportiert haRef, toggleDone, hideForMe (Auto-Cleanup)
    │   │   ├── HADetailModal.jsx   ← Bearbeiten, Erledigt, Für mich/für alle löschen
    │   │   ├── PruefungenSection.jsx ← Inline-Eingabe, Countdown-Pills; exportiert pruefungColor
    │   │   ├── ChatPanel.jsx       ← Bubbles, Auto-Scroll, Eingabezeile; Aktionsmenü (Bearbeiten/Löschen), Inline-Edit, Pencil-Marker, Tombstone
    │   │   └── chatActions.js      ← editMessage, deleteMessage (Tombstone), purgeMessage (Hard-Delete/Kaskade), canEditMessage, canDeleteMessage
    │   ├── bibliothek/
    │   │   ├── LibraryFilters.jsx      ← Filterleiste (Suche, Sortierung, Dateityp, Autor, Kurs-Chips, Typ-Pills)
    │   │   ├── SammlungCard.jsx        ← Kachel einer Sammlung (Name, Item-Anzahl, geteilt-Badge)
    │   │   ├── SammlungDetailModal.jsx ← Sammlung öffnen: Material-Grid, entfernen, umbenennen, teilen, löschen/verlassen
    │   │   ├── AddToSammlungModal.jsx  ← Material zu Sammlung(en) hinzufügen/entfernen + „Neue Sammlung"
    │   │   └── ShareSammlungModal.jsx  ← Klassenmitglieder für Freigabe an-/abwählen
    │   └── modals/
    │       ├── KurswahlModal.jsx   ← Toggle-Karten, Suche, Alle (ab)wählen, memberIds-Diff
    │       ├── KursMitgliederModal.jsx ← Kurs-Mitgliederliste (uid→Nickname via users-Query), Entfernen für Kurs-/Klassen-Admins
    │       ├── KursFormModal.jsx   ← Create+Edit, Vorlagen, Zeiten-Editor, Farbwahl + Monogramm-Vorschau
    │       └── ConfirmDialog.jsx   ← generischer Bestätigungsdialog (busy-State)
    └── pages/
        ├── Landing.jsx             ← Marketing-Page (classsync.de)
        ├── Login.jsx               ← Login + Passwort-Reset-Flow
        ├── Register.jsx
        ├── VerifyEmail.jsx         ← E-Mail-Bestätigungs-Screen (harte Sperre): Auto-Versand, „Ich habe bestätigt" (reload), Resend mit Cooldown, Abmelden
        ├── Onboarding.jsx          ← Klasse erstellen/beitreten; exportiert KURSWAHL_FLAG
        ├── UebersichtPage.jsx      ← Startseite „/" (HAs + Prüfungen + neueste Materialien)
        ├── BibliothekPage.jsx      ← /bibliothek – kursübergreifende Materialsicht (Filter) + Sammlungen-Tab
        ├── KursPage.jsx            ← /kurs/:kursId – Header (inkl. Mitglieder-Button), Tabs, MaterialGrid, HA/Prüfungen/Chat
        ├── KalenderPage.jsx        ← /kalender (Woche/Monat; Stundenplan integriert)
        └── ProfilPage.jsx          ← /profil – Nickname, Klasse/Code, Mitglieder-Moderation (Sperren/Entsperren/Klasse verlassen), Gefahrenzone
```

**Routen:** `/` Übersicht · `/bibliothek` · `/kurs/:kursId` · `/kalender` · `/profil` · `/stundenplan` → Redirect auf `/kalender` · `*` → `/`
**Sidebar-Nav:** Übersicht · Bibliothek · Kalender (+ Kursliste, Profil/Glocke/Theme unten)

---

## 6. Firestore-Datenmodell

**Kernänderung ggü. v1:** Kurs-Mitgliedschaft liegt als **`memberIds`-Array am Kurs-Doc** statt `kurseIds` am User. Vorteile: Sidebar = ein Filter über den Kurse-Listener, HA-Auto-Cleanup gegen `memberIds` prüfbar, keine toten Kurs-IDs, Mitgliederzahl gratis.

```
/users/{uid}
  nickname:   string
  email:      string
  klasseId:   string | null      ← wird beim Klassen-Löschen automatisch genullt
  createdAt:  number
  # KEIN kurseIds, KEIN rolle-Feld

/klassen/{klasseId}
  name:       string
  code:       string             ← 5-stellig, ohne 0/O/1/I
  adminIds:   string[]           ← Multi-Admin
  bannedIds:  string[]           ← NEU: gesperrte uids (Rejoin-Sperre + Selbst-Eviction), optional
  bannedInfo: { uid: nickname }  ← NEU: denormalisierte Nicknames der Gesperrten (Anzeige), optional
  createdAt:  number

/klassen/{klasseId}/kurse/{kursId}
  name, lehrer, raum: string
  zeiten:     [{ day: "Mo".."Fr", zeit: "HH:MM", zeitEnde: "HH:MM" }]
  farbe:      string (Hex)
  # (Alt-Kurse können noch ein icon-Feld (Emoji) haben – wird seit dem
  #  Design-Feinschliff ignoriert; Anzeige läuft über CourseAvatar-Monogramme)
  erstellerId:   string          ← Kurs-Admin (ersetzt altes adminId)
  erstellerNick: string
  memberIds:  string[]           ← NEU: beigetretene User
  createdAt:  number

  /materialien/{matId}
    typ:         "Mitschrift"|"Aufgabenblatt"|"HA-Lösung"|"Lernzettel"
    titel, beschreibung: string
    dateiUrl:    string | null
    storagePath: string | null   ← für zuverlässiges Storage-Löschen
    dateiTyp:    "PDF"|"Bild"|"Notiz"
    dateiName:   string | null   ← NEU: Original-Dateiname
    autor:       string  (Nickname, denormalisiert)
    autorId:     string
    likes:       string[]
    createdAt:   serverTimestamp

  /hausaufgaben/{haId}
    text:        string
    faellig:     "YYYY-MM-DD"
    autor, autorId: string
    doneBy:      string[]
    hiddenBy:    string[]
    createdAt:   serverTimestamp

  /pruefungen/{prId}
    titel:       string
    datum:       "YYYY-MM-DD"
    autor:       string
    autorId:     string          ← NEU (v1-Rules verglichen Nickname mit UID = Bug, behoben)
    createdAt:   serverTimestamp

  /chat/{msgId}
    text, autor, autorId: string
    createdAt:   serverTimestamp
    editedAt:    serverTimestamp   ← NEU: gesetzt beim Bearbeiten (= „bearbeitet"-Marker), optional
    deleted:     bool              ← NEU: Tombstone; true → Platzhalter, text geleert, optional

/klassen/{klasseId}/sammlungen/{sammlungId}   ← NEU: Material-Bibliothek-Sammlungen
  name:        string
  ownerId:     string            ← Ersteller (verwaltet Freigabe/Umbenennen/Löschen)
  ownerNick:   string            ← denormalisiert (Anzeige)
  memberIds:   string[]          ← [ownerId] = privat; weitere = geteilt/kollaborativ
  items:       [{ kursId, matId, titel, typ }]   ← Referenzen + denormalisierte Fallback-Labels
  createdAt:   number
```

**Storage-Pfad:** `klassen/{klasseId}/kurse/{kursId}/{timestamp}_{filename}`

---

## 7. Rollen & Rechte

| Aktion | Mitglied | Kurs-Admin (Ersteller) | Klassen-Admin |
|---|---|---|---|
| Kurse beitreten/verlassen | ✅ | ✅ | ✅ |
| Kurs erstellen | ✅ | ✅ | ✅ |
| Kurs bearbeiten | ❌ | ✅ (nur eigener) | ✅ (alle) |
| Kurs löschen | ❌ | ✅ (nur eigener) | ✅ (alle) |
| Mitglied aus Kurs entfernen | ❌ | ✅ (nur eigener) | ✅ (alle) |
| Material hochladen | ✅ | ✅ | ✅ |
| Eigenes Material löschen | ✅ | ✅ | ✅ |
| Fremdes Material löschen | ❌ | ✅ | ✅ |
| Material liken | ✅ | ✅ | ✅ |
| Sammlung erstellen | ✅ | ✅ | ✅ |
| Sammlung umbenennen/löschen/teilen | ❌ (nur Ersteller) | ❌ (nur Ersteller) | ❌ (nur Ersteller)* |
| Sammlungs-Items ändern | ✅ (wenn Mitglied der Sammlung) | ✅ (dito) | ✅ (dito) |
| HA eintragen | ✅ | ✅ | ✅ |
| HA bearbeiten | ❌ (nur eigene) | ❌ (nur eigene) | ✅ |
| HA für sich löschen | ✅ | ✅ | ✅ |
| HA für alle löschen | ❌ (nur eigene) | ❌ (nur eigene)* | ✅ |
| HA abhaken (doneBy) | ✅ | ✅ | ✅ |
| Prüfung eintragen | ✅ | ✅ | ✅ |
| Prüfung löschen | ❌ (nur eigene) | ❌ (nur eigene)* | ✅ |
| Chat schreiben | ✅ | ✅ | ✅ |
| Eigene Nachricht bearbeiten | ✅ | ✅ | ✅ |
| Fremde Nachricht bearbeiten | ❌ | ❌ | ❌ |
| Eigene Nachricht löschen (Tombstone) | ✅ | ✅ | ✅ |
| Fremde Nachricht löschen (Tombstone) | ❌ | ✅ (im eigenen Kurs) | ✅ (alle) |
| User zum Admin machen | ❌ | ❌ | ✅ |
| Mitglied aus Klasse sperren/entsperren | ❌ | ❌ | ✅ |
| Klasse selbst verlassen | ✅ | ✅ | ✅ (außer letzter Admin) |
| Klasse löschen | ❌ | ❌ | ✅ |

\* Die **Rules** erlauben dem Kurs-Admin zusätzlich das Löschen fremder HAs/Prüfungen/Chat-Docs – das braucht die **Lösch-Kaskade** beim Kurs-Löschen. Die **UI** bietet diese Buttons aber nur Autor/Klassen-Admin an. Bei **Sammlungen** ist die Sammlung-Verwaltung (umbenennen/löschen/teilen) dem Ersteller vorbehalten; der Klassen-Admin darf Sammlungen nur für die **Lösch-Kaskade** beim Klassen-Löschen entfernen (keine UI dafür).

---

## 8. Security Rules

Vollständig in [`firestore.rules`](firestore.rules) und [`storage.rules`](storage.rules) – **Deployment manuell** über die Firebase Console (Copy-Paste → Veröffentlichen). Kernpunkte:

- Helper: `isAuth()`, `uid()`, `me()` (get auf eigenes User-Doc), `isMember(klasseId)`, `isKlassenAdmin(klasseId)`, **`isKursAdmin(klasseId, kursId)`** (get auf Kurs-Doc, vergleicht `erstellerId`)
- `users`: read selbst oder gleiche Klasse; create/update nur selbst; **update zusätzlich mit Rejoin-Sperre** – man darf `klasseId` nur auf eine Klasse setzen, in deren `bannedIds` man nicht steht (Nullen/Unverändert bleiben erlaubt); delete false
- `klassen`: read alle Auth-User (nötig für Code-Query beim Beitritt); create mit `uid in adminIds`; update/delete nur Admins (Ban = Admin schreibt `bannedIds`/`bannedInfo`, keine Extra-Rule nötig)
- `kurse`: create nur mit `erstellerId == uid` **und** `memberIds == [uid]`; update Klassen-Admin/Ersteller **oder** `affectedKeys().hasOnly(['memberIds'])` (= Selbst-Beitritt/-Austritt für jedes Mitglied); delete Klassen-Admin/Ersteller
- `materialien`: update Admin/Autor oder `hasOnly(['likes'])`; **delete Klassen-Admin/Kurs-Admin/Autor**
- `hausaufgaben`: update Admin/Autor oder `hasOnly(['doneBy','hiddenBy'])`; delete Klassen-Admin/Kurs-Admin/Autor
- `pruefungen`: create mit `autorId == uid`; update/delete Klassen-Admin/Kurs-Admin/Autor
- `chat`: create mit `autorId == uid`; **update** zwei Pfade — (a) Autor bearbeitet eigenen Text: `hasOnly(['text','editedAt'])` und nur solange `deleted != true`; (b) Tombstone-Löschen durch Autor/Kurs-Admin/Klassen-Admin: `deleted == true` und `hasOnly(['deleted','text'])`; **delete** (Hard) weiterhin Klassen-Admin/Kurs-Admin (**nur** für die Lösch-Kaskade)
- `sammlungen`: read nur Sammlungs-Mitglieder (`uid in memberIds`); create mit `ownerId == uid` und `memberIds == [uid]`; update entweder Owner (alles) oder Sammlungs-Mitglied, aber nur `hasOnly(['items','memberIds'])` (Kollaboration + Selbst-Verlassen); delete Owner **oder** Klassen-Admin (Letzterer nur für die Lösch-Kaskade)
- **storage.rules**: Klassen-Check per cross-service `firestore.get()` auf das User-Doc; create zusätzlich ≤ 10 MB und contentType PDF/`image/*`; update false

⚠️ **Bekannter, behobener Bug (nicht wieder einführen!):** In v1 der Rules war `chat: delete false` absolut – dadurch scheiterte die Lösch-Kaskade von Klasse/Kurs mit permission-denied, nachdem Materialien/HAs/Prüfungen schon gelöscht waren. Fix: `isKursAdmin`-Helper + delete-Erlaubnis für Admins in allen Subcollections.

⚠️ **IAM-Voraussetzung:** Das Storage-Dienstkonto (`service-…@gcp-sa-firebasestorage.iam.gserviceaccount.com`) braucht die Rolle **Cloud Datastore User**, sonst schlägt jedes `firestore.get()` in den Storage-Rules fehl. Ist für `classsync-v2` gesetzt.

---

## 9. Wichtige Implementierungsdetails

### Hostname-Routing (`main.jsx`)
```js
const isLocal = host === "localhost" || host === "127.0.0.1";
const isApp = (host.startsWith("app.") || isLocal) && params.get("landing") !== "1";
// isApp → <App/> (mit BrowserRouter), sonst <Landing/>
```
Lokal läuft also immer die App; die Landingpage sieht man unter `localhost:5173/?landing=1`.

### Auth-Gate-Kette (`App.jsx`)
`!firebaseConfigured` → SetupHinweis · `loading` → Spinner · `!user` → Login/Register (`?register=true` beachtet) · **`!emailVerified` → VerifyEmail (harte Sperre, vor dem Profil-Check → greift für neue wie bestehende Nutzer)** · `!profile` → Spinner · `!profile.klasseId` → Onboarding · sonst `KlasseProvider` → `KlasseGate` (Klasse gelöscht → Onboarding) → `NotificationProvider` → `AppShell`.

### E-Mail-Verifizierung (`AuthContext`, `VerifyEmail`)
- `emailVerified`-State wird in `onAuthStateChanged` aus `u?.emailVerified` gesetzt (lokales ID-Token, **kein** Request). `reload()` triggert `onAuthStateChanged` **nicht** und mutiert das User-Objekt in-place → `reloadVerification()` ruft `auth.currentUser.reload()` und spiegelt `emailVerified` in den State (erzwingt Re-Render + Gate-Weiterschaltung).
- **Kein Auto-Versand in `register()`** – ausschließlich der `VerifyEmail`-Screen sendet (einmal beim Mount, `useRef`-Guard gegen StrictMode-Doppel-Mount). So gibt es garantiert **eine** Mail pro Screen-Besuch, kein Doppelversand. Resend-Button mit 60 s-Cooldown; `too-many-requests` deutsch abgefangen.
- Kein Rules-/Firebase-Deploy nötig. Optional/später ließe sich die Sperre serverseitig über `request.auth.token.email_verified` in den Rules erzwingen – bewusst **nicht** umgesetzt (würde bestehende unverifizierte Sessions hart abschneiden; UI-Sperre reicht).

### Kurswahl nach Beitritt
`joinByCode()` setzt `sessionStorage["classsync_showKurswahl"]="1"`; `AppShell` liest das Flag einmalig beim Mount und öffnet das Modal.

### Kurs beitreten/verlassen
```js
updateDoc(kursRef, { memberIds: join ? arrayUnion(uid) : arrayRemove(uid) });
// Rules-Ausnahme: jedes Mitglied darf updates mit hasOnly(['memberIds'])
```

### HA-System
```js
// Abhaken:      doneBy: arrayUnion/arrayRemove(uid)
// Für mich:     hiddenBy: arrayUnion(uid); danach:
//               wenn alle kurs.memberIds in hiddenBy UND (uid==autorId || isKlassenAdmin) → deleteDoc
// Anzeige:      hausaufgaben.filter(h => !h.hiddenBy?.includes(uid))
```

### Chat-Moderation (`ChatPanel.jsx`, `chatActions.js`)
- **Löschen ist ein `update`, kein `delete`.** Grund: Ein Tombstone soll sichtbar bleiben, und das Recht ist feiner (Autor + Kurs-Admin + Klassen-Admin). `deleteMessage` setzt `{ deleted:true, text:"" }` (Text wird geleert, damit Admins auch beleidigende Inhalte wirklich entfernen). Der echte `deleteDoc` (`purgeMessage`) läuft ausschließlich in der Lösch-Kaskade.
- **Rechte:** `canModerate = isKlassenAdmin || kurs.erstellerId === uid`. Bearbeiten nur Autor (`canEditMessage`), Löschen Autor **oder** `canModerate` (`canDeleteMessage`); beide sperren bereits gelöschte Nachrichten.
- **UI:** Klick/Tap auf eine Bubble mit erlaubten Aktionen öffnet ein absolut positioniertes Menü (schließt bei Outside-Click/Escape via document-Listener; Bubble-Klick `stopPropagation`). Bearbeitet-Marker = `msg.editedAt && !msg.deleted` → `<Pencil size={10}>`. Kein Emoji (Designleitfaden) – daher Icon statt „*".

### Bibliothek & Sammlungen
```js
// Bibliothek-Datenquelle: useAcrossKurse("materialien") (flach, je Doc um .kurs ergänzt)
// Sammlungen (Klassenebene) live: onSnapshot(query(
//   collection(db,"klassen",klasseId,"sammlungen"),
//   where("memberIds","array-contains", uid)))  → split nach ownerId (meine / geteilt)
// Items pflegen: Read-Modify-Write auf sammlung.items (kleines Array), Dedupe per matId
// Anzeige: item.matId gegen die Live-Materialliste auflösen; nicht gefunden → "nicht verfügbar"
```
`MaterialCard`/`MaterialPreviewModal` sind über optionale Props (`showKurs`, `onAddToSammlung`) rückwärtskompatibel erweitert – die KursPage nutzt sie ohne diese Props und bleibt unverändert.

### Lösch-Kaskade (`lib/klasseActions.js`)
`deleteKurs`: Storage-`listAll` + `deleteObject` (try/catch) → Subcollections `materialien/hausaufgaben/pruefungen/chat` in 450er-`writeBatch`es → Kurs-Doc. `deleteKlasse`: alle Kurse via `deleteKurs` → **Sammlungen-Subcollection** → Klassen-Doc. Reihenfolge wichtig: Kurs-/Klassen-Doc **zuletzt**, weil die Rules (`isKursAdmin`/`isKlassenAdmin`) sie per `get()` noch lesen müssen.

### Rauswurf bei gelöschter Klasse
`KlasseContext` beobachtet das Klassen-Doc; existiert es nicht mehr **oder** steht die eigene uid in `bannedIds` → `updateDoc(users/{uid}, { klasseId: null })` → Auth-Gate zeigt Onboarding. Funktioniert live für alle eingeloggten Mitglieder.

### Mitglieder-Moderation (`lib/klasseActions.js`, `ProfilPage`, `KursMitgliederModal`)
- **Warum `bannedIds` am Klassen-Doc statt Schreiben ins fremde User-Doc?** Die `users`-Rules erlauben nur das Bearbeiten des *eigenen* Docs – ein Admin kann `klasseId` fremder User gar nicht nullen. Also editiert der Admin nur das Klassen-Doc (`banFromKlasse`: uid in `bannedIds`, raus aus `adminIds` + allen `memberIds`, Nickname in `bannedInfo`), und der Betroffene wirft sich per `KlasseContext`-Listener selbst ins Onboarding – dasselbe Muster wie beim Klassen-Löschen.
- **Rejoin-Sperre doppelt:** serverseitig über die `users`-Update-Rule (`get()` auf die Ziel-Klasse) **und** clientseitig als Pre-Check in `joinByCode` **vor** dem `updateDoc`. Der Client-Check ist nötig für die UX: ein direkter Write würde von Firestore erst **optimistisch lokal** angewendet → Auth-Gate rendert kurz die App → `Onboarding` unmountet → Server-Rollback → frisches `Onboarding` **ohne** Fehlermeldung. Der Pre-Check wirft vorher eine klare Meldung, ohne Remount.
- **`leaveKlasse(klasseId, uid, kurse, isAdmin)`:** raus aus allen eigenen Kursen, dann (nur wenn `isAdmin`) aus `adminIds`, zuletzt eigene `klasseId` nullen. Der `isAdmin`-Guard ist Pflicht – ein Nicht-Admin darf das Klassen-Doc nicht schreiben, sonst würde der `adminIds`-Write mit permission-denied das Nullen verhindern.
- **Kurs-Entfernen** braucht keine eigene Funktion/Rule: `setKursMembership(…, false)` mit fremder uid; die `kurse`-Update-Rule erlaubt Admin/Ersteller bereits jede `memberIds`-Änderung.
- Gesperrte, die ihre `klasseId` noch nicht selbst genullt haben, matchen weiter die Mitglieder-Query → in `ProfilPage` **ausgegraut mit „Gesperrt"-Tag** (nicht ausgeblendet, keine Aktions-Buttons). Kurs-Modal ist nicht betroffen (uid schon aus `memberIds` entfernt).

### Benachrichtigungen (`NotificationContext`)
Pro eigenem Kurs ein `onSnapshot` auf `materialien`; nur `docChanges().type=="added"`, Dedupe über `seenIds`-Ref, Filter `ts > lastSeen` und `autorId !== uid`. `markAllRead()` setzt `classsync_lastSeen_{uid}` = jetzt und leert die Liste. `createdAt` von `serverTimestamp` kann beim lokalen Echo noch null sein → Fallback `Date.now()`.

### Kalender-Raster (`WeekGrid.jsx`)
```js
const PX_PER_MIN = 1.15, INNER_PAD = 14;
const minToPx = min => INNER_PAD + (min - DAY_START) * PX_PER_MIN;
// DAY_START = min(früheste Startzeit abgerundet, 8:00)
// DAY_END   = max(späteste Endzeit + 30, 16:00)
```
`useAcrossKurse("pruefungen")` liefert Prüfungen aller eigenen Kurse; `KalenderPage` gruppiert sie zu `pruefungenByISO`.

### Upload (`UploadModal.jsx`)
`MAX_MB = 10` (Client-Check; Storage-Rules erzwingen es serverseitig nochmal). Ohne Datei + mit Beschreibung → `dateiTyp: "Notiz"`. `storagePath = klassen/{kId}/kurse/{kursId}/{Date.now()}_{file.name}`.

### Responsive-Verhalten
- `< 768px`: Sidebar als Overlay-Drawer (Hamburger in mobiler TopBar), schließt bei Navigation
- `≥ 1200px` (`useIsWide`): KursPage zweispaltig – links Materialien/Chat-Tabs, rechts HA + Prüfungen; Tab-State fällt beim Umschalten auf breit automatisch auf „material" zurück (Edge-Case behandelt in `KursPage.jsx`)

---

## 10. Bekannte Limitierungen & TODOs

- **Kein Multi-Klassen-Support** – User gehört genau einer Klasse an
- **Keine Push-Notifications** – nur In-App (FCM wäre der nächste Schritt, braucht Blaze-Plan)
- **Keine Offline-Unterstützung**
- **Max. Dateigröße 10 MB** (`MAX_MB` in `UploadModal.jsx` + Storage-Rules – beide Stellen ändern!)
- **Sammlungen:** `items` liegen als Array im Sammlung-Doc (klein gedacht, für Prüfungs-Bündel völlig ausreichend). Bei sehr großen Sammlungen wäre eine Subcollection sinnvoller. Verwaiste Item-Referenzen (gelöschtes Material) werden beim Auflösen als „nicht verfügbar" behandelt, nicht automatisch bereinigt.
- GitHub↔Vercel Auto-Deploy ggf. noch nicht verbunden (s. §2)
- Zwei E2E-Test-Accounts in Firebase Auth übrig (s. §2)
- Der JS-Bundle ist ~820 kB (Firebase) – Vite warnt; Code-Splitting wäre eine mögliche Optimierung
- HA-Doc bleibt versteckt liegen, wenn alle es „für sich gelöscht" haben, aber weder Autor noch Klassen-Admin der letzte Ausblendende war (bewusste Design-Entscheidung, harmlos)

---

## 11. Entwicklung & Deployment

### Lokal
```bash
cd "C:\Users\janni\ClassSync Fable"
npm install          # einmalig
npm run dev          # http://localhost:5173  (App; Landing: /?landing=1)
npm run build        # Produktions-Build nach dist/ (inkl. PWA-Service-Worker)
```
`.claude/launch.json` existiert im Projektordner (Server-Name `classsync-fable`, Port 5173) – Claude Code kann den Dev-Server damit direkt starten.

### Deployment
```bash
git add . && git commit -m "beschreibung" && git push   # → Auto-Deploy, WENN Git in Vercel verbunden
# sonst manuell:
vercel --prod
```
Hinweis aus der Praxis: Vercel-Builds schlugen vereinzelt mit „Unexpected error" **vor** dem Build-Step fehl (Infrastruktur-Aussetzer). Lösung: einfach erneut deployen, oder ein erfolgreiches Preview-Deploy mit `vercel promote <url>` zu Production machen.

### Rules ändern
`firestore.rules` / `storage.rules` im Repo bearbeiten → Inhalt in der Firebase Console einfügen → Veröffentlichen. (Es gibt kein automatisches Rules-Deployment.)

---

## 12. Environment Variables

```
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN            = classsync-v2.firebaseapp.com
VITE_FIREBASE_PROJECT_ID             = classsync-v2
VITE_FIREBASE_STORAGE_BUCKET         = classsync-v2.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
```
- Lokal: `.env.local` (gitignored; enthält zusätzlich ein harmloses `VERCEL_OIDC_TOKEN`, das die Vercel-CLI dort pflegt)
- Produktiv: als Vercel-Env-Vars in **allen drei** Environments (Production/Preview/Development) gesetzt
- Ohne Keys zeigt die App den Setup-Hinweis (crasht nicht)

---

## 13. Fächervorlagen (`lib/faecher.js`)

Vorlagen setzen **Name + Farbe** (Anzeige als Monogramm, keine Icons):

| Fach | Farbe | | Fach | Farbe |
|---|---|---|---|---|
| Mathematik | #6366f1 | | Informatik | #3b82f6 |
| Deutsch | #f59e0b | | Musik | #ec4899 |
| Biologie | #10b981 | | Geografie | #10b981 |
| Englisch | #3b82f6 | | Wirtschaft | #f59e0b |
| Chemie | #ef4444 | | Politik & Gesellschaft | #8b5cf6 |
| Geschichte | #8b5cf6 | | Religion/Ethik | #94a3b8 |
| Physik | #06b6d4 | | Latein | #d97706 |
| Französisch | #ec4899 | | Spanisch | #ef4444 |
| Sport | #f97316 | | Kunst | #14b8a6 |

Material-Typ-Farben (`MAT_COLORS`): Mitschrift #6366f1 · Aufgabenblatt #f59e0b · HA-Lösung #10b981 · Lernzettel #ec4899.
`MAT_ICONS`/`DATEITYP_ICONS` sind **Lucide-Komponenten** (PenLine/ClipboardList/CircleCheck/BookOpen bzw. FileText/Image/StickyNote) – Verwendung: `const Icon = MAT_ICONS[typ]; <Icon size={16} />`.

---

## 14. UI-Komponenten (`components/ui/UI.jsx`)

- `<Btn variant="primary|ghost|soft|danger|dangerGhost|success" full small>` – Button
- `<IconButton title active badge>` – 36×36-Icon-Button mit optionalem Zähler-Badge
- `<Input label error textarea>` – Formular-Input (auch Textarea-Modus)
- `<Modal width onClose noPad>` – Overlay-Modal (Escape + Backdrop-Klick schließen; `onClose=undefined` sperrt Schließen während busy)
- `<ModalHeader title subtitle onClose>`
- `<Pill label color>` / `<Tag label bg fg>` – farbige Badges
- `<Divider>` / `<SectionTitle action>` / `<Spinner size center>` / `<Card hover onClick>`
- `<Empty icon={LucideIcon} text sub action>` – icon nimmt eine Lucide-Komponente (oder fertiges Element)
- `<CloseButton onClick>` – einheitlicher Schließen-Button (X)
- `<LogoMark size>` – flaches Logo-Mark (GraduationCap auf Akzent-Quadrat)
- `<CourseAvatar name farbe size radius>` (eigene Datei) – Kurs-Monogramm
- `<DateiIcon typ size color>` (eigene Datei) – PDF/Bild/Notiz-Icon

Alle Komponenten holen sich die Design-Tokens über `useTheme()` → `t`. Lucide-Icons: `size` 13–19 je nach Kontext, `strokeWidth 1.8` (Buttons/Nav) bzw. 2+ (Checks).
