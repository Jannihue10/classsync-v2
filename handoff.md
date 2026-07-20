# ClassSync – Vollständiges Handoff-Dokument (v2 / „Fable"-Rebuild)
*Zuletzt aktualisiert: 20. Juli 2026*

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
| **Firebase** | Projekt **`classsync-v2`** – Auth (E-Mail/Passwort), Firestore, Storage (Bucket `classsync-v2.firebasestorage.app`). Client-Keys als `VITE_FIREBASE_*` in `.env.local` (nicht in Git) und als Vercel-Env-Vars (Production/Preview/Development). **Service-Account** (Admin-SDK, für die Auth-Mail-Function) als `FIREBASE_CLIENT_EMAIL`/`FIREBASE_PRIVATE_KEY`/`FIREBASE_PROJECT_ID` (unpräfixiert, nur Server) |
| **Resend** | Transaktionale Auth-Mails (Verify + Passwort-Reset). Absender-Domain **`mail.classsync.de`** (DKIM/SPF/DMARC bei IONOS verifiziert). API-Key als Vercel-Env-Var `RESEND_API_KEY`. Versand über die Serverless-Function `api/auth-email.js` |
| **Domains** | `classsync.de` + `app.classsync.de` → Vercel-Projekt `classsync-v2` (vom alten Vercel-Projekt entfernt). DNS/Nameserver: IONOS → Vercel |

**Hinweise:**
- Deployment Protection („Vercel Authentication") wurde für das Projekt deaktiviert, sonst wäre die Seite nicht öffentlich.
- **GitHub↔Vercel Auto-Deploy ist aktiv** (bestätigt 17. Juli 2026): Push auf `main` → Production, Branch-Push → Preview. **Preview-Deployments sind per „Vercel Authentication" (SSO) geschützt** (Settings → Deployment Protection) – für anonyme curl-Tests der Preview muss die Protection kurz deaktiviert werden; Production ist öffentlich.
- In Firebase **Authentication** existieren noch Test-Accounts aus E2E-Tests, die gelöscht werden können: `classsync.test.a@testmail.de`, `classsync.test.b@testmail.de` (leere `users`-Dokumente) sowie `classsync.test.verify@testmail.de` (aus dem Verifizierungs-Test – unverifiziert, mit `users`-Doc; per Client-Rules nicht löschbar → in der Console entfernen).

---

## 3. Features

### Auth & Nutzer
- Registrierung mit **E-Mail, Passwort & Nickname** (E-Mail nie für andere sichtbar)
- Login via Firebase Authentication, **Passwort vergessen** (Reset-Mail via Resend, s. §9 „Auth-Mails über Resend")
- **E-Mail-Verifizierung als harte Sperre:** Unverifizierte Nutzer (neu registriert **oder** bestehend nach nächstem Login) sehen den `VerifyEmail`-Screen und erhalten erst nach Klick auf den Bestätigungslink Zugriff auf die App. **Verifizierungs- und Reset-Mails laufen in Prod gebrandet über Resend** (eigener Serverless-Endpoint erzeugt den Firebase-Action-Link; in DEV Firebase-Standardmail als Fallback – s. §9). **Traffic-schonend:** `emailVerified` aus dem lokalen ID-Token (kein Request), Auto-Versand **einmal** pro Screen-Besuch, Status-Check nur on-demand per Button (`reload()`), „Erneut senden" mit 60 s-Cooldown; kein Polling. Screen bietet zusätzlich „Abmelden" (falsche Adresse → neu registrieren).
- **E-Mail-Adresse ändern** (Profil → „Dein Profil" → „E-Mail ändern", `ChangeEmailModal`): Reauthentifizierung mit aktuellem Passwort, dann Bestätigungslink an die **neue** Adresse (Prod gebrandet über Resend, DEV Firebase-Standardmail). Die Adresse wechselt erst nach Klick (`verifyBeforeUpdateEmail`-Mechanik); das denormalisierte `users.email` wird danach automatisch nachgezogen. Bereits vergebene Zieladresse → klare Meldung „E-Mail wird bereits verwendet". S. §9 „E-Mail-Adresse ändern".
- **Account löschen** (Profil-Gefahrenzone **und** Onboarding, `DeleteAccountModal`): Reauthentifizierung, dann clientseitiger Cleanup + Auth-Delete. Umfang aktuell **„Mitgliedschaft + Profil"** (geteilte Inhalte bleiben mit Nickname erhalten). **Letzter Admin** einer Klasse → Löschen blockiert. Auch für **klassenlose** Nutzer im Onboarding erreichbar. S. §9 „Account löschen" (inkl. Plan für den DSGVO-Voll-Wipe).
- Deutsche Fehlermeldungen via `authErrorText()` in `AuthContext.jsx`
- URL-Parameter `?register=true` öffnet direkt das Registrierungsformular
- Ohne Firebase-Keys in `.env.local` zeigt die App einen **Setup-Hinweis** statt zu crashen (`firebaseConfigured`-Check in `lib/firebase.js`)

### Klassen
- Jeder eingeloggte User kann eine Klasse erstellen → wird automatisch erster Admin
- **5-stelliger Zugangscode**, ohne verwechselbare Zeichen (kein 0/O/1/I), Generator in `lib/klasseActions.js`. **Eindeutig:** `createKlasse` vergibt den Code über `generateUniqueCode()`, das vor dem Schreiben per Query prüft, ob er schon existiert, und sonst neu würfelt (sonst nähme `joinByCode` bei Doppel-Code blind `docs[0]` → Beitritt in die falsche Klasse)
- Beitritt per Code → **Kurswahlmodal öffnet automatisch** (sessionStorage-Flag `classsync_showKurswahl`)
- **Multi-Klassen (Juli 2026):** Ein User kann Mitglied **mehrerer Klassen** sein. Mitgliedschaft liegt als **`users.klasseIds[]`**; die gerade sichtbare Klasse ist **`users.activeKlasseId`**. Die App bleibt immer auf **eine aktive Klasse** skopiert (der ganze Feature-Code arbeitet unverändert gegen `klasse.id`) – der `KlasseProvider` wird per `key={activeKlasseId}` neu gemountet, wenn man wechselt.
- **Klassen-Wechsler:** Dropdown in der **Sidebar-Kopfzeile** (Klassenname → Liste aller eigenen Klassen + „Klasse hinzufügen") und **Profil → „Deine Klassen"**. Wechsel = `switchActiveKlasse` (setzt `activeKlasseId`). „Klasse hinzufügen" öffnet `AddKlasseModal` (dasselbe Beitreten/Erstellen-Formular wie das Onboarding, `KlasseForm`).
- **Multi-Admin** über `klassen.adminIds` (Array) – Admins können promoten/degradieren, letzter Admin ist geschützt (UI zeigt „letzter Admin" statt Button). Die **eigene** Degradierung verlangt zusätzlich eine Bestätigung (`ConfirmDialog`), weil man sich die Rechte nicht selbst zurückholen kann – dafür braucht es einen anderen Admin. Fremde Mitglieder zu degradieren bleibt bewusst direkt (reversibel: der Handelnde bleibt Admin und kann jederzeit wieder promoten)
- **Mitglieder-Moderation (Klassenebene):** Klassen-Admins können Mitglieder **sperren** (Ban) – der Betroffene fliegt aus allen Kursen und der Klasse und kann mit dem Code **nicht** wieder beitreten, bis ein Admin ihn entsperrt. Umgesetzt über `klassen.bannedIds` (Client wirft sich per Listener selbst raus, s. §9). Gesperrte werden in der Mitgliederliste **ausgegraut** mit „Gesperrt"-Tag angezeigt, plus eigene **„Gesperrt"-Sektion** zum Entsperren. Admins können nicht direkt gebannt werden (erst degradieren).
- **Klasse selbst verlassen:** Jedes Mitglied verlässt die **aktive** Klasse über das Profil (aus allen Kursen raus + `klasseId` aus `klasseIds` entfernt; war es die aktive Klasse, fällt `activeKlasseId` auf eine verbleibende zurück oder wird null → Onboarding). Der **letzte Admin** ist geschützt (muss erst Rolle übertragen oder Klasse löschen). *Nur die aktive Klasse verlassbar – für eine andere erst dorthin wechseln (sonst fehlt die geladene Kursliste zum Aufräumen der `memberIds`).*
- Klasse löschen (nur Klassen-Admin): **Kaskade** löscht alle Kurse inkl. Subcollections, **Sammlungen** und Storage-Dateien; Mitglieder werden über den `MembershipsContext`-Listener automatisch aus `klasseIds` entfernt (aktive Klasse weg → nächste/Onboarding). Kaskade meldet die genaue Stufe bei Fehlern (`stepError`, s. §9).

### Schuljahres-Migration (Juli 2026)
Ein Klassen-Admin kann am Schuljahresende „die ganze Klasse in eine neue übernehmen".
- **Ablauf:** Profil → aktive Klasse → **„Ins neue Schuljahr übernehmen"** (`MigrateKlasseModal`). Ziel = **neue Klasse anlegen** *oder* **bestehende selbst-administrierte Klasse** wählen. Bestätigen schreibt ein `migration`-Feld an die **Quell**-Klasse (`startMigration`): `{ id, targetId, targetName, memberIds (Snapshot ohne Gesperrte), createdAt }`.
- **Einladung + Bestätigen (kein Auto-Join):** Betroffene Mitglieder sehen einen **`MigrationBanner`** („… beitreten?") und treten **selbst** bei (`acceptMigration` → `arrayUnion` in `klasseIds` + neue Klasse aktiv). Sie **bleiben** Mitglied der alten Klasse. Muster wie Ban: der Client bedient sich selbst per Listener (`MembershipsContext.pendingMigrations`).
- **„Später":** blendet den Banner **dauerhaft** aus (`migrationsSeen` am User-Doc), die Einladung bleibt aber unter **Profil → „Deine Klassen" → „Offene Einladungen"** jederzeit annehmbar (`openMigrations` = ungefiltert; `pendingMigrations` = Banner, seen-gefiltert).
- **Ende:** Einladung verschwindet, sobald man beigetreten ist **oder** die Admin sie zurückzieht (`endMigration` → `migration`-Feld gelöscht; im Modal „Migration beenden").
- **Sicherheit:** Ein Beitritt setzt die neue Klasse immer als `activeKlasseId` → die `users`-Update-Rule kann den Ban-Schutz einzeln prüfen (s. §8). Ban-Pre-Check zusätzlich clientseitig in `acceptMigration`.

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
- **Prüfungs-Verknüpfung:** Eine Sammlung kann optional **genau eine Prüfung** referenzieren (Feld `pruefung`, s. §6) – gewählt beim Anlegen (`SammlungFormModal`) oder später im Detailmodal, **nur durch den Ersteller** (deckt sich mit dem Owner-Zweig der Update-Rule, deshalb ohne Rules-Änderung). Kachel und Detailkopf zeigen Prüfungstitel + Countdown-Pill (`PruefungChip`, nutzt `pruefungColor` aus `PruefungenSection`).
- **Rückrichtung:** In der Prüfungsliste eines Kurses erscheint unter der Prüfung je ein Chip der zugehörigen Sammlungen → Klick auf `/bibliothek?sammlung=<id>` (die `BibliothekPage` öffnet daraufhin Tab + Detailmodal und räumt den Query-Param wieder ab). Sichtbar sind nur eigene und mit einem geteilte Sammlungen – `useSammlungen` fragt `memberIds array-contains uid` ab, deckungsgleich mit der Read-Rule.
- Wird eine verknüpfte Prüfung gelöscht (oder verlässt man den Kurs), bleibt die Referenz **bewusst stehen** – **keine Kaskade**, gleiches Prinzip wie bei „Material nicht mehr verfügbar". Das denormalisierte `titel`/`datum` trägt die Anzeige weiter; der Chip wird zusätzlich **durchgestrichen + „nicht mehr verfügbar"** markiert (`isPruefungVerwaist` in `PruefungChip.jsx`). Gelöscht vs. Kurs verlassen ist clientseitig **nicht** unterscheidbar, daher dieselbe unscharfe Formulierung wie beim Material.
- ⚠️ Die Verwaist-Erkennung schließt aus dem **Fehlen** eines Docs – dafür reicht die Liste aus `useAcrossKurse` allein nicht, sie ist anfangs schlicht leer. Deshalb trägt sie ein **`ready`-Flag** (true, sobald jeder Kurs-Listener seinen ersten Snapshot geliefert hat); solange es false ist, gilt nichts als verwaist. Der Übergangszustand zeigt also im Zweifel den normalen Countdown und kippt danach – nie umgekehrt. **Wer künftig aus einem fehlenden Doc etwas ableitet, muss `ready` genauso abfragen.**
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
**Struktur: drei Pill-Tabs** (`TabBar`, Muster aus dem Kurs-Header). Die Seite war zuvor ein einziger Scroll aus sechs gestapelten Karten und wurde im Juli 2026 aufgeräumt – gleiche Features, neue Gliederung (s. §9 „Profilseite").

| Tab | Inhalt |
|---|---|
| **Konto** | Nickname ändern (live via Firestore-Listener) · E-Mail-Anzeige (nur für einen selbst) + **„E-Mail ändern"** (`ChangeEmailModal`, s. §9) · **Design** (Hell/Dunkel als Segmente) · **UI-Größe** (Auto/Klein/Normal/Groß, s. §9) · Abmelden · ⚠️ **Account löschen** (für alle, `DeleteAccountModal`, s. §9) |
| **Klassen** | **„Deine Klassen"**: alle eigenen Klassen (`MembershipsContext.myClasses`), aktive markiert, „Wechseln" je Klasse, „Klasse hinzufügen" (`AddKlasseModal`); darunter **„Offene Einladungen"** (Migration, `openMigrations`) mit „Beitreten" – die Anzahl liegt als Badge am Tab. **„Aktive Klasse"**: Name + Zugangscode mit **Kopieren-Button**, „Kurse verwalten", „Klasse verlassen" (letzter Admin gesperrt), für Admins **„Ins neue Schuljahr übernehmen"** (`MigrateKlasseModal`). ⚠️ **Klasse löschen** (nur Admin, mit sichtbarer Fehlermeldung bei Kaskaden-Problemen) |
| **Mitglieder** | **Mitgliederliste live** (Query `users where klasseIds array-contains <aktive Klasse>`), Admin-Badge (Crown), Letzter-Admin-Schutz. Admin-Aktionen (**Zum Admin / Admin entfernen / Entfernen & sperren**) liegen hinter einem **Overflow-Menü** je Zeile, nicht mehr als bis zu drei Buttons nebeneinander. „Admin entfernen" in der **eigenen** Zeile öffnet vorher eine Rückfrage (s. §3 Klassen); `MitgliederListe` löst per `onSelfDemote` nur aus, der Dialog liegt wie alle anderen in `ProfilPage`. Dazu die **„Gesperrt"-Sektion** zum Entsperren (s. §3 Klassen) |

Beide Gefahrenzonen nutzen dieselbe Komponente (`DangerCard`) und sitzen jeweils unten im passenden Tab – früher waren es zwei fast identische rote Karten am Seitenende.

### Landingpage (`classsync.de`)
- `Landing.jsx`: Sticky Nav (Blur), Hero mit Gradient-Headline, Features-Grid (6), 3-Schritte-Sektion, CTA, Footer
- „Anmelden" → `https://app.classsync.de`, „Kostenlos starten" → `https://app.classsync.de?register=true`

### PWA
- `vite-plugin-pwa` (autoUpdate), `manifest` in `vite.config.js`: standalone, theme `#111111`, Icons 192/512
- Icons 16/32/180/192/512 in `/public/` (aus dem alten Projekt übernommen)

### Theming & Designsprache
- Kompletter **Light/Dark Mode** mit Design-Tokens in `src/styles/theme.js`; initial via `prefers-color-scheme`, gespeichert in `localStorage` (`classsync_theme`)
- **Umschalten nur an einer Stelle:** In der eingeloggten App liegt die Design-Wahl ausschließlich im **Profil → Konto → „Design"** (Segmente Hell/Dunkel, direkt über der UI-Größe). Der frühere Icon-Button im Sidebar-Fuß wurde entfernt – er war die zweite Bedienstelle für dieselbe Einstellung und existierte auf Mobil ohnehin nie (die TopBar hatte ihn nicht). Der Toggle in `AuthLayout` **bleibt**: auf Login/Register/Onboarding gibt es kein Profil, dort ist er die einzige Möglichkeit.
- **Globale UI-Skalierung (Juli 2026):** Auf Tablets war die UI zu klein (ein iPad ist weder `isMobile` noch `isWide` und bekam Desktop-Größen). Die ganze App skaliert jetzt über **CSS `zoom` auf `#root`**, gesteuert per `--cs-scale` aus dem `ThemeContext`. Tablet-Breite → automatisch **1.15x**, Desktop/Handy → 1.0. Im Profil zusätzlich wählbar (**Automatisch / Klein / Normal / Groß**, `classsync_uiscale` in `localStorage`). „Klein" = 1.0 = exakt das Aussehen vor der Änderung und damit der Notausgang. Details + Fallstricke in §9 „UI-Skalierung & Safe-Area"
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
| Transaktions-Mails | Resend (`resend ^4`) via Serverless-Function `api/auth-email.js`; Links erzeugt mit `firebase-admin ^12` (Admin-SDK) |
| Serverless | Vercel Functions im `api/`-Verzeichnis (ESM, `firebase-admin` + `resend` als echte Dependencies) |
| PWA | vite-plugin-pwa (`^1.3.0`) |
| Hosting | Vercel (SPA-Rewrite via `vercel.json`, `api/*` ausgenommen) |
| Styling | Inline Styles + Design-Tokens (kein CSS-Framework) |
| Icons | lucide-react (`^1.24`), tree-shakeable Linien-Icons |
| Fonts | Inter (Google Fonts, via `index.html`) |

---

## 5. Projektstruktur

```
ClassSync Fable/
├── index.html                      ← PWA-Meta, Inter, CSS-Reset + Keyframes, #root { zoom: var(--cs-scale) }
├── vite.config.js                  ← react() + VitePWA (Manifest, workbox.navigateFallbackDenylist [/^\/api/])
├── vercel.json                     ← SPA-Rewrite: alle Pfade → /index.html, /api/* per Negative-Lookahead ausgenommen
├── package.json
├── firestore.rules                 ← im Repo versioniert; deployen: Firebase Console → Firestore → Regeln
├── storage.rules                   ← dito (Console → Storage → Rules)
├── .env.local                      ← Firebase-Client-Keys (VITE_*) + Server-Keys (RESEND/FIREBASE_*) für lokalen Test (NICHT in Git)
├── .claude/launch.json             ← Dev-Server-Config für Claude Code (npm run dev, Port 5173)
├── api/                            ← Vercel Serverless Functions
│   ├── auth-email.js               ← Verify/Reset/ChangeEmail-Mail: Admin-SDK erzeugt Firebase-Action-Link → Versand via Resend (ChangeEmail mit Vorab-Check „Adresse frei?")
│   └── _emailTemplates.js          ← gebrandete HTML-Mails (Verify + Reset + ChangeEmail), Inline-HTML/Tabellen-Layout
├── scripts/                        ← backfill-klasseids.mjs (einmalige Feld-Migration) · test-resend.mjs (lokaler Auth-Mail-Test ohne Deploy: verify|reset|changeEmail)
├── public/                         ← favicon.svg, icon-16/32/180/192/512.png, icons.svg
└── src/
    ├── main.jsx                    ← Hostname-Switch: app.* ODER localhost → <App/>, sonst <Landing/>; ?landing=1 = Landing-Vorschau lokal, **?app=1 = App auf Preview-Domains erzwingen** (s. §9)
    ├── App.jsx                     ← Auth-Gate: … → Onboarding (klasseIds leer) → MembershipsProvider → KlasseProvider(key=activeKlasseId) → AppShell
    ├── lib/
    │   ├── firebase.js             ← Init aus import.meta.env; exportiert db, auth, storage, firebaseConfigured
    │   ├── dates.js                ← formatDatum, parseDatum, calcTage, tageLabel, relativeTime, formatUhrzeit, getKW, mondayOf, timeToMin, todayISO, dateToISO, WOCHENTAGE
    │   ├── faecher.js              ← FACH_VORLAGEN (18), MAT_TYPEN, MAT_COLORS, MAT_ICONS, DATEITYP_ICONS, KURS_FARBEN
    │   ├── klasseActions.js        ← generateCode/generateUniqueCode (Kollisionsprüfung), createKlasse/joinByCode (klasseIds+activeKlasseId, Ban-Pre-Check), switchActiveKlasse, promote/demoteAdmin, setKursMembership, banFromKlasse/unbanFromKlasse, leaveKlasse (Multi-Klassen), startMigration/acceptMigration/dismissMigration/endMigration, deleteKurs/deleteKlasse (Kaskade inkl. Sammlungen, stepError-Kontext)
    │   ├── authActions.js          ← **NEU**: deleteAccount({user,profile,myClasses,currentPassword}) – Reauth, Letzter-Admin-Guard, Mitgliedschafts-Cleanup, users-Doc + Auth-User löschen. Naht (`TODO`) für DSGVO-Voll-Wipe (s. §9)
    │   ├── useKursCollection.js    ← Hook: Live-Listener auf eine Kurs-Subcollection; tsMillis()
    │   ├── useAcrossKurse.js       ← Hook: eine Subcollection über ALLE eigenen Kurse (für Übersicht/Kalender/Bibliothek), Docs um kurs-Objekt ergänzt; **`.ready`-Flag an der Liste** (alle Listener haben geliefert) für Aufrufer, die aus einem *fehlenden* Doc schließen
    │   ├── useSammlungen.js        ← Hook: Live-Listener auf Sammlungen, in denen ich Mitglied bin; getrennt nach meine (owner) / geteilt
    │   ├── sammlungActions.js      ← create/rename/delete, addItem/removeItem, setSammlungMembers, leaveSammlung, itemFromMaterial, **setSammlungPruefung/pruefungRefFrom**
    │   └── useMediaQuery.js        ← useIsMobile (<768px), **useIsTablet (768–1199px)**, useIsWide (≥1200px); nutzt jetzt die MOBILE_/WIDE_BREAKPOINT-Konstanten aus theme.js
    ├── context/
    │   ├── AuthContext.jsx         ← Firebase Auth + Live-Profil (onSnapshot users/{uid}); register (klasseIds:[]/activeKlasseId:null) + **Lazy-Migration** Alt-klasseId→klasseIds; login/logout/resetPassword/updateProfile; emailVerified-State + sendVerification/reloadVerification; **changeEmail** (Reauth + Resend/DEV-Fallback) + **users.email-Sync** nach Wechsel; authErrorText
    │   ├── MembershipsContext.jsx  ← **NEU**: beobachtet ALLE eigenen Klassen (klasseIds). Liefert myClasses (Wechsler/Profil), openMigrations/pendingMigrations (Einladungen), und wirft bei Ban/Löschung klassenübergreifend selbst raus (arrayRemove aus klasseIds + activeKlasseId neu wählen)
    │   ├── ThemeContext.jsx        ← mode, toggle, t (Token-Objekt) + **scale/scalePref/setScalePref** (UI-Skalierung, setzt `--cs-scale` am documentElement)
    │   ├── KlasseContext.jsx       ← Listener auf die **aktive** Klasse (klasse=null bei gelöscht/gesperrt; Eviction macht jetzt MembershipsContext), Kurse-Listener; meineKurse, isKlassenAdmin, canManageKurs
    │   └── NotificationContext.jsx ← Material-Listener pro eigenem Kurs der aktiven Klasse, lastSeen, Dedupe per ID, grouped, markAllRead
    ├── styles/theme.js             ← themes.light/dark (Tokens), radius, SIDEBAR_WIDTH, Breakpoints, PAGE_PAD, UI_SCALES + **vhScaled/vwScaled** (Viewport-Einheiten gegen den zoom) und **safeInset/safePad/safeExtra** (Safe-Area, s. §9)
    ├── components/
    │   ├── ui/UI.jsx               ← Btn, IconButton, Input, Modal, ModalHeader, CloseButton, Pill, Tag, Divider, SectionTitle, Spinner, Empty, Card, LogoMark
    │   ├── ui/TabBar.jsx           ← **NEU**: Pill-Tabs ({id,label,icon,badge}) + badgeTone="danger|neutral"; genutzt von KursPage **und** ProfilPage
    │   ├── ui/CourseAvatar.jsx     ← farbiges Kurs-Monogramm (ersetzt Emoji-Icons)
    │   ├── ui/DateiIcon.jsx        ← PDF/Bild/Notiz-Icon (Lucide)
    │   ├── layout/
    │   │   ├── AppShell.jsx        ← Sidebar + Main, Routes (inkl. /bibliothek), Mobile-Drawer, MigrationBanner, öffnet Kurswahl-/KursForm-/AddKlasse-/Notification-Overlays
    │   │   ├── Sidebar.jsx         ← Logo + **Klassen-Switcher-Dropdown** (myClasses, aktive ✓, „Klasse hinzufügen"), Nav (Übersicht, Bibliothek, Kalender), Kursliste (+ Kurs, Kurse verwalten), Profil/Glocke unten
    │   │   ├── MigrationBanner.jsx ← **NEU**: offene Schuljahres-Einladungen (pendingMigrations) mit „Beitreten"/„Später"
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
    │   │   ├── SammlungCard.jsx        ← Kachel einer Sammlung (Name, Item-Anzahl, geteilt-Badge, Prüfungs-Chip)
    │   │   ├── SammlungFormModal.jsx   ← **NEU**: „Neue Sammlung" (Name + Prüfung); ersetzt den früheren window.prompt
    │   │   ├── PruefungSelect.jsx      ← **NEU**: Auswahl der Prüfung (nur kommende; verwaiste Referenz bleibt als Option)
    │   │   ├── PruefungChip.jsx        ← **NEU**: Anzeige der verknüpften Prüfung (Titel + Countdown-Pill)
    │   │   ├── SammlungDetailModal.jsx ← Sammlung öffnen: Material-Grid, entfernen, umbenennen, Prüfung verknüpfen, teilen, löschen/verlassen
    │   │   ├── AddToSammlungModal.jsx  ← Material zu Sammlung(en) hinzufügen/entfernen + „Neue Sammlung"
    │   │   └── ShareSammlungModal.jsx  ← Klassenmitglieder für Freigabe an-/abwählen
    │   ├── profil/                 ← **NEU** (Juli 2026): Bausteine der Profilseite, s. §9 „Profilseite"
    │   │   ├── SettingRow.jsx      ← Einstellungszeile (Label+Hinweis links, Control rechts) + SegmentedControl (Design, UI-Größe)
    │   │   ├── KontoTab.jsx        ← Tab „Konto": Nickname-Form, E-Mail, Design, UI-Größe, Abmelden, Account-Gefahrenzone
    │   │   ├── KlassenListe.jsx    ← myClasses-Wechsler + „Offene Einladungen" (acceptMigration)
    │   │   ├── AktiveKlasseCard.jsx ← Name, Mitgliederzahl, Code-Kopierbutton, Kurse verwalten, Migration, Verlassen
    │   │   ├── MitgliederListe.jsx ← Mitglieder + Gesperrt-Sektion; Admin-Aktionen im MoreVertical-Overflow-Menü
    │   │   └── DangerCard.jsx      ← eine rote Karte (title/text/buttonLabel/onClick/error) für Klasse **und** Account löschen
    │   └── modals/
    │       ├── KurswahlModal.jsx   ← Toggle-Karten, Suche, Alle (ab)wählen, memberIds-Diff
    │       ├── KursMitgliederModal.jsx ← Kurs-Mitgliederliste (uid→Nickname via users-Query `klasseIds array-contains`), Entfernen für Kurs-/Klassen-Admins
    │       ├── KursFormModal.jsx   ← Create+Edit, Vorlagen, Zeiten-Editor, Farbwahl + Monogramm-Vorschau
    │       ├── KlasseForm.jsx      ← **NEU**: geteiltes Beitreten/Erstellen-Formular (Tabs, Code/Name); exportiert KURSWAHL_FLAG. Von Onboarding UND AddKlasseModal genutzt
    │       ├── AddKlasseModal.jsx  ← **NEU**: weitere Klasse hinzufügen (kapselt KlasseForm im Modal)
    │       ├── MigrateKlasseModal.jsx ← **NEU**: Schuljahres-Migration starten (Ziel neu/bestehend) bzw. laufende beenden
    │       ├── ChangeEmailModal.jsx ← **NEU**: neue E-Mail + aktuelles Passwort; sendet Bestätigungslink (Resend/Firebase), Erfolgs-/Fehlerzustand
    │       ├── DeleteAccountModal.jsx ← **NEU**: Passwort-Reauth + Account löschen; `myClasses` als **Prop** (auch im Onboarding nutzbar), sichtbare Fehler (inkl. Letzter-Admin-Block)
    │       └── ConfirmDialog.jsx   ← generischer Bestätigungsdialog (busy-State; schluckt onConfirm-Fehler → Aufrufer muss selbst anzeigen)
    └── pages/
        ├── Landing.jsx             ← Marketing-Page (classsync.de)
        ├── Login.jsx               ← Login + Passwort-Reset-Flow
        ├── Register.jsx
        ├── VerifyEmail.jsx         ← E-Mail-Bestätigungs-Screen (harte Sperre): Auto-Versand, „Ich habe bestätigt" (reload), Resend mit Cooldown, Abmelden
        ├── Onboarding.jsx          ← Klasse erstellen/beitreten (klassenlos); nutzt KlasseForm, re-exportiert KURSWAHL_FLAG; **Abmelden + „Konto löschen"** (DeleteAccountModal, damit auch klassenlose Nutzer löschen können)
        ├── UebersichtPage.jsx      ← Startseite „/" (HAs + Prüfungen + neueste Materialien)
        ├── BibliothekPage.jsx      ← /bibliothek – kursübergreifende Materialsicht (Filter) + Sammlungen-Tab
        ├── KursPage.jsx            ← /kurs/:kursId – Header (inkl. Mitglieder-Button), Tabs, MaterialGrid, HA/Prüfungen/Chat
        ├── KalenderPage.jsx        ← /kalender (Woche/Monat; Stundenplan integriert)
        └── ProfilPage.jsx          ← /profil – schlanker Container: Tab-State (Konto/Klassen/Mitglieder), der `mitglieder`-Listener und **alle** Modals/ConfirmDialogs. Der sichtbare Inhalt liegt in `components/profil/`
```

**Skripte (`scripts/`)**: `backfill-klasseids.mjs` — einmaliges Firebase-Admin-Skript, das für alle bestehenden User `klasseId → klasseIds[]`/`activeKlasseId` nachträgt (s. §9 Multi-Klassen). `test-resend.mjs` — lokaler Auth-Mail-Test (`verify|reset|changeEmail`) über Admin-SDK + Resend ohne Deploy (s. §9 E-Mail-Adresse ändern).

**Routen:** `/` Übersicht · `/bibliothek` · `/kurs/:kursId` · `/kalender` · `/profil` · `/stundenplan` → Redirect auf `/kalender` · `*` → `/`
**Sidebar-Nav:** Übersicht · Bibliothek · Kalender (+ Kursliste, Profil/Glocke unten)

---

## 6. Firestore-Datenmodell

**Kernänderung ggü. v1:** Kurs-Mitgliedschaft liegt als **`memberIds`-Array am Kurs-Doc** statt `kurseIds` am User. Vorteile: Sidebar = ein Filter über den Kurse-Listener, HA-Auto-Cleanup gegen `memberIds` prüfbar, keine toten Kurs-IDs, Mitgliederzahl gratis.

```
/users/{uid}
  nickname:       string
  email:          string
  klasseIds:      string[]        ← NEU (Multi-Klassen): alle Mitgliedschaften
  activeKlasseId: string | null   ← NEU: gerade sichtbare Klasse (in klasseIds oder null)
  migrationsSeen: string[]        ← NEU: mit „Später" ausgeblendete Migrations-IDs, optional
  createdAt:      number
  # klasseId (alt, Einzelwert) wird durch Lazy-Migration/Backfill nach klasseIds überführt
  #  und danach ignoriert; KEIN kurseIds, KEIN rolle-Feld

/klassen/{klasseId}
  name:       string
  code:       string             ← 5-stellig, ohne 0/O/1/I; eindeutig (generateUniqueCode-Check beim Erstellen)
  adminIds:   string[]           ← Multi-Admin
  bannedIds:  string[]           ← gesperrte uids (Rejoin-Sperre + Selbst-Eviction), optional
  bannedInfo: { uid: nickname }  ← denormalisierte Nicknames der Gesperrten (Anzeige), optional
  migration:  {                  ← NEU: laufende Schuljahres-Einladung, optional (nur während Migration)
                id, targetId, targetName, memberIds:string[], createdAt
              }
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
  pruefung:    { kursId, prId, titel, datum } | null   ← NEU, optional: „wofür ist das gedacht"
                                                 (dieselbe Referenz-Mechanik wie items; nur der
                                                  Owner darf sie setzen)
  createdAt:   number
```

**Storage-Pfad:** `klassen/{klasseId}/kurse/{kursId}/{timestamp}_{filename}`

---

## 7. Rollen & Rechte

| Aktion | Mitglied | Kurs-Admin (Ersteller) | Klassen-Admin |
|---|---|---|---|
| Mehreren Klassen angehören / wechseln | ✅ | ✅ | ✅ |
| Weitere Klasse beitreten/erstellen | ✅ | ✅ | ✅ |
| Schuljahres-Migration starten | ❌ | ❌ | ✅ (der Quellklasse) |
| Migrations-Einladung annehmen/ablehnen | ✅ | ✅ | ✅ |
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
| Eigene E-Mail ändern | ✅ | ✅ | ✅ |
| Eigenen Account löschen | ✅ | ✅ | ✅ (blockiert, solange letzter Admin einer Klasse) |

\* Die **Rules** erlauben dem Kurs-Admin zusätzlich das Löschen fremder HAs/Prüfungen/Chat-Docs – das braucht die **Lösch-Kaskade** beim Kurs-Löschen. Die **UI** bietet diese Buttons aber nur Autor/Klassen-Admin an. Bei **Sammlungen** ist die Sammlung-Verwaltung (umbenennen/löschen/teilen) dem Ersteller vorbehalten; der Klassen-Admin darf Sammlungen nur für die **Lösch-Kaskade** beim Klassen-Löschen **lesen+löschen** (keine UI dafür – die Bibliothek zeigt nur eigene Sammlungen). Die Read-Erlaubnis für Admins ist nötig, damit die Kaskade alle Sammlungen auflisten kann (sonst `permission-denied` bei Fremd-Sammlungen).

---

## 8. Security Rules

Vollständig in [`firestore.rules`](firestore.rules) und [`storage.rules`](storage.rules) – **Deployment manuell** über die Firebase Console (Copy-Paste → Veröffentlichen). Kernpunkte:

- Helper: `isAuth()`, `uid()`, `me()` (get auf eigenes User-Doc), **`isMember(klasseId)` = `klasseId in me().get('klasseIds', [])`** (Multi-Klassen), `isKlassenAdmin(klasseId)`, **`isKursAdmin(klasseId, kursId)`** (get auf Kurs-Doc, vergleicht `erstellerId`)
- `users`: **read** selbst **oder** wer mind. eine Klasse teilt (`resource.klasseIds.hasAny(me().klasseIds)`); create nur selbst; **update** nur selbst mit Multi-Klassen-Logik: `activeKlasseId` muss null oder in `klasseIds` sein, und beim **Hinzufügen** einer Klasse (klasseIds wächst per Set-`difference`) darf **nur genau** die neue `activeKlasseId` dazukommen und man darf dort nicht gesperrt sein (Ban-Schutz; Entfernen/Umsortieren frei). **delete: nur das eigene Doc** (`uid()==userId`) – für die Account-Löschung (war vorher `false`)
- `klassen`: read alle Auth-User (nötig für Code-Query beim Beitritt); create mit `uid in adminIds`; update/delete nur Admins (Ban = Admin schreibt `bannedIds`/`bannedInfo`; **Migration** = Admin schreibt `migration`-Feld – beides ohne Extra-Rule, weil Admins alle Felder dürfen)
- `kurse`: create nur mit `erstellerId == uid` **und** `memberIds == [uid]`; update Klassen-Admin/Ersteller **oder** `affectedKeys().hasOnly(['memberIds'])` (= Selbst-Beitritt/-Austritt für jedes Mitglied); delete Klassen-Admin/Ersteller
- `materialien`: update Admin/Autor oder `hasOnly(['likes'])`; **delete Klassen-Admin/Kurs-Admin/Autor**
- `hausaufgaben`: update Admin/Autor oder `hasOnly(['doneBy','hiddenBy'])`; delete Klassen-Admin/Kurs-Admin/Autor
- `pruefungen`: create mit `autorId == uid`; update/delete Klassen-Admin/Kurs-Admin/Autor
- `chat`: create mit `autorId == uid`; **update** zwei Pfade — (a) Autor bearbeitet eigenen Text: `hasOnly(['text','editedAt'])` und nur solange `deleted != true`; (b) Tombstone-Löschen durch Autor/Kurs-Admin/Klassen-Admin: `deleted == true` und `hasOnly(['deleted','text'])`; **delete** (Hard) weiterhin Klassen-Admin/Kurs-Admin (**nur** für die Lösch-Kaskade)
- `sammlungen`: **read** Sammlungs-Mitglieder (`uid in memberIds`) **oder Klassen-Admin** (Letzterer nötig, damit die Lösch-Kaskade alle Sammlungen auflisten kann – s. ⚠️ unten); create mit `ownerId == uid` und `memberIds == [uid]`; update entweder Owner (alles) oder Sammlungs-Mitglied, aber nur `hasOnly(['items','memberIds'])` (Kollaboration + Selbst-Verlassen); delete Owner **oder** Klassen-Admin (Letzterer nur für die Lösch-Kaskade)
- **storage.rules**: Klassen-Check per cross-service `firestore.get()` auf das User-Doc, **`klasseId in ...klasseIds`** (Multi-Klassen); create zusätzlich ≤ 10 MB und contentType PDF/`image/*`; update false

⚠️ **Bekannter, behobener Bug (nicht wieder einführen!):** In v1 der Rules war `chat: delete false` absolut – dadurch scheiterte die Lösch-Kaskade von Klasse/Kurs mit permission-denied, nachdem Materialien/HAs/Prüfungen schon gelöscht waren. Fix: `isKursAdmin`-Helper + delete-Erlaubnis für Admins in allen Subcollections.

⚠️ **Zweiter behobener Kaskaden-Bug (Juli 2026):** Die `sammlungen`-**read**-Rule war auf Sammlungs-Mitglieder beschränkt; die Lösch-Kaskade (`deleteKlasse`) liest aber per `getDocs` **alle** Sammlungen der Klasse → `permission-denied`, sobald eine Sammlung einem anderen Mitglied gehörte. Fix: `|| isKlassenAdmin(klasseId)` in der Sammlungen-read-Rule. Man kann nur löschen, was man auflisten (lesen) darf – bei jeder cascade-gelöschten Subcollection also read **und** delete für Admins sicherstellen.

⚠️ **IAM-Voraussetzung:** Das Storage-Dienstkonto (`service-…@gcp-sa-firebasestorage.iam.gserviceaccount.com`) braucht die Rolle **Cloud Datastore User**, sonst schlägt jedes `firestore.get()` in den Storage-Rules fehl. Ist für `classsync-v2` gesetzt.

---

## 9. Wichtige Implementierungsdetails

### Hostname-Routing (`main.jsx`)
```js
const isLocal = host === "localhost" || host === "127.0.0.1";
const isProdDomain = /(^|\.)classsync\.de$/.test(host);
// ?app=1 wird pro Origin in localStorage gemerkt (classsync_forceApp)
const isApp = (host.startsWith("app.") || isLocal || forceApp) && params.get("landing") !== "1";
// isApp → <App/> (mit BrowserRouter), sonst <Landing/>
```
Lokal läuft also immer die App; die Landingpage sieht man unter `localhost:5173/?landing=1`.

⚠️ **Preview-Deployments waren nicht testbar (behoben Juli 2026).** Eine Vercel-Preview läuft auf `classsync-v2-….vercel.app` – das ist weder `app.*` noch localhost, also zeigte sie die **Landingpage**, deren Buttons absolut auf `app.classsync.de` zeigen. Wer eine Preview testen wollte, landete unbemerkt in der **Produktion** und testete die alte Version. Zwei Gegenmaßnahmen:
- **`?app=1`** erzwingt die App und wird in `localStorage` gemerkt (`classsync_forceApp`), damit der Schalter Routenwechsel **und** den Start aus dem Homescreen (PWA) überlebt. `?landing=1` schaltet zurück und löscht das Flag. Auf `classsync.de` selbst ist der Override **wirkungslos**, damit die Marketing-Domain nicht dauerhaft in die App kippen kann.
- **`Landing.jsx`** zeigt außerhalb der echten Domain auf die **eigene Origin** (`APP_URL`/`REGISTER_URL`) statt auf die Produktion.

**Preview testen:** `https://classsync-v2-git-<branch>-jerk-s-projects.vercel.app/?app=1` (der `git-<branch>`-Alias bleibt über alle Commits des Branches gleich).

### UI-Skalierung & Safe-Area (`theme.js`, `ThemeContext`, `index.html`)
**Warum `zoom` und nicht rem/Tokens?** Die App hat **keine** Größen-Tokens – alle Größen sind hartkodierte Zahlen-Literale in Inline-Styles (~205× `fontSize`, ~177× `gap`, ~159× `padding`, ~122× Icon-`size`, zusammen 700+ Stellen; kein einziges `rem`). Eine rem-Migration hätte alle 700 angefasst. Stattdessen skaliert **eine** Zeile alles proportional:
```css
#root { zoom: var(--cs-scale, 1); }   /* index.html */
```
`zoom` statt `transform: scale`, weil `zoom` **echtes Layout** skaliert – Umbrüche und `minmax()`-Grid-Spalten rechnen korrekt neu, und `position: fixed` bleibt intakt (bei `transform: scale` nicht!).

⚠️ **Viewport-Einheiten müssen gegengerechnet werden.** `vh`/`vw` lösen innerhalb des gezoomten `#root` gegen den **unskalierten** Viewport auf und werden danach mitskaliert → 15 % zu groß. Deshalb `vhScaled(n)`/`vwScaled(n)` aus `theme.js` statt roher `vh`/`vw`. Ohne das wäre die App-Shell auf dem iPad 1357px statt 1180px hoch (Buttons unten abgeschnitten) und das Benachrichtigungs-Panel bei Einstellung „Groß" auf einem 390px-Schirm 494px breit (statt 390). **Bei neuen `vh`/`vw`-Werten immer die Helfer nutzen.**

⚠️ **Safe-Area-Grundsatz: absorbieren, nicht addieren.** Die Insets lagen ursprünglich *zusätzlich* auf Padding, das schon da war (`calc(10px + env(...))` bzw. Inset am Wrapper + Padding am Kind). Weil die Gerätewerte stark schwanken (iPhone-Notch ~59px, iPad ~24px, Desktop 0), fiel die Summe auf **jedem Gerät um einen anderen Betrag** zu groß aus. Richtig ist „mindestens Design-Padding, **mindestens** Inset" – also `max()`:
```js
safeInset(side)          // env(...) / var(--cs-scale)  – Inset darf NICHT mitskalieren:
                         //   wo die Notch physisch sitzt, ändert sich nicht mit der Schriftgröße
safePad(side, base)      // max(base, inset)      – Flächen mit eigenem Padding
safeExtra(side, covered) // max(0, inset - covered) – Wrapper, deren Kind schon paddet
```
Gemessen (physische px): iPad-Kopf 42 → 24, iPad-Hauptbereich 44 → 24, iPhone-Header 69 → 59, iPhone-Fußzeile 44 → 34. Desktop unverändert (Inset 0 → `max()` fällt auf das bisherige Padding zurück).

**Betroffene Flächen** (bei neuen Vollbild-Flächen mitdenken!): Sidebar-Kopf/-Fuß, Mobile-Header, `<main>`, **Benachrichtigungs-Panel** (`top:0`/`bottom:0`-Slide-over) und **jedes Modal** (Overlay-Padding, weil der Karton `92vh` hoch werden darf). Zwei Feinheiten: Die Sidebar-Linke rechnet gegen **12px** (kleinstes inneres Padding von Nav/Fußzeile), sonst ragen diese Zeilen im Querformat in die Notch. Und der schwebende Theme-Umschalter im `AuthLayout` bleibt bewusst **additiv** – dort sind die 14px gewollter Abstand *zur* sicheren Kante, kein Flächen-Padding.

**`PAGE_PAD`** (=20) liegt in `theme.js` und wird von den fünf Seiten-Containern **tatsächlich benutzt**, weil `AppShell` die Safe-Area-Differenz dagegen rechnet (`safeExtra("top", PAGE_PAD)`). Als Literal in fünf Dateien wäre die Kopplung still gebrochen, sobald jemand das Seiten-Padding ändert.

⚠️ **`matchMedia` misst den echten Viewport, nicht die gezoomte Fläche.** Auf einem iPad im Hochformat (820px) bleibt `isMobile` also korrekt `false`, aber die nutzbare Layout-Breite sinkt auf 820/1.15 ≈ 713px. Bei 1.15x unkritisch – das ist der Grund, warum die Automatik **nicht** höher geht: bei 1.3x im Hochformat fällt das Material-Grid (`minmax(230px, 1fr)`) auf eine Spalte zurück. „Groß" ist deshalb bewusst eine Nutzer-Entscheidung und kein Default.

### Auth-Gate-Kette (`App.jsx`)
`!firebaseConfigured` → SetupHinweis · `loading` → Spinner · `!user` → Login/Register (`?register=true` beachtet) · **`!emailVerified` → VerifyEmail (harte Sperre, vor dem Profil-Check → greift für neue wie bestehende Nutzer)** · `!profile` → Spinner · **`klasseIds` leer → Onboarding** · sonst `MembershipsProvider` → `KlasseProvider key={activeKlasseId}` → `KlasseGate` → `NotificationProvider` → `AppShell`. `activeKlasseId` = `profile.activeKlasseId`, falls in `klasseIds`, sonst `klasseIds[0]` (Fallback). `KlasseGate` zeigt bei `klasse == null` nur einen Spinner (transient bei gelöschter/gesperrter aktiver Klasse – der `MembershipsProvider` entfernt sie dann aus `klasseIds`, danach greift eine andere aktive Klasse oder das Onboarding).

### Multi-Klassen & aktive Klasse (`MembershipsContext`, `App.jsx`)
- Mitgliedschaft = `users.klasseIds[]`, sichtbare Klasse = `users.activeKlasseId`. Der `key={activeKlasseId}` am `KlasseProvider` erzwingt beim Wechsel einen **sauberen Remount** des klassen-skopierten Baums (inkl. `AppShell`, `NotificationProvider`) → der gesamte Feature-Code bleibt unverändert single-class.
- **`MembershipsProvider`** (über dem KlasseProvider): pro-Doc-`onSnapshot` auf alle `klasseIds` → `myClasses` (Wechsler/Profil). Erkennt gelöschte/gesperrte Klassen und wirft sich selbst raus: `updateProfile({ klasseIds: arrayRemove(id), activeKlasseId: war-aktiv ? rest[0]??null : unverändert })`. Erkennt Migrations-Einladungen → `openMigrations`/`pendingMigrations`.
- **Wechseln:** `switchActiveKlasse(uid, id)` = `updateDoc(users/uid, { activeKlasseId })`. **Hinzufügen:** `AddKlasseModal` → `KlasseForm` (createKlasse/joinByCode setzen `arrayUnion(klasseIds)` + `activeKlasseId`). Nach Beitritt greift wie gehabt das Kurswahl-Flag (AppShell remountet ja durch den Wechsel).

### Schuljahres-Migration (`klasseActions`, `MigrateKlasseModal`, `MigrationBanner`)
- **Start (Admin):** `startMigration(sourceId, target, memberIds)` schreibt `migration:{id,targetId,targetName,memberIds,createdAt}` an die **Quell**-Klasse. `target` = neu via `createKlasse` **oder** bestehende selbst-administrierte Klasse (`myClasses` gefiltert auf `adminIds.includes(uid)`). `memberIds` = aktuelle Mitglieder ohne Gesperrte.
- **Annahme (Mitglied):** `MembershipsContext` liefert `pendingMigrations` (Banner) und `openMigrations` (Profil). `acceptMigration(uid, migration)` = Ban-Pre-Check + `arrayUnion(klasseIds, targetId)` + `activeKlasseId=targetId` + `arrayUnion(migrationsSeen, id)`. Bleibt in der alten Klasse.
- **„Später":** `dismissMigration` (nur `migrationsSeen`) → Banner weg, aber `openMigrations` (ungefiltert) hält die Einladung im Profil annehmbar. **Ende:** `endMigration(sourceId)` = `migration: deleteField()`.
- **Warum Einladung statt stiller Auto-Join?** Sauberer (keine stille Anmeldung) **und** sicherer: ein Beitritt setzt die neue Klasse als `activeKlasseId`, sodass die `users`-Update-Rule den Ban genau auf diese eine Klasse prüfen kann (per Set-`difference` der hinzugekommenen IDs).

### Feld-Migration `klasseId` → `klasseIds` (`AuthContext`, `scripts/backfill-klasseids.mjs`)
- **Lazy (Client):** Lädt das Profil ein Alt-Dokument mit `klasseId` aber ohne `klasseIds`, schreibt `AuthContext` sofort `{ klasseIds:[klasseId], activeKlasseId:klasseId }` ins **eigene** Doc (Rule erlaubt das) und spiegelt es lokal. Sicherheitsnetz für Einzelfälle.
- **Backfill (einmalig, Admin-SDK):** `node scripts/backfill-klasseids.mjs ./serviceAccountKey.json [--dry-run]`. Nötig, weil ein Client **fremde** User-Docs nicht schreiben darf – ohne Backfill erscheinen noch nicht eingeloggte Alt-Mitglieder nicht in den `klasseIds array-contains`-Queries (Mitgliederlisten). Idempotent (überspringt bereits migrierte), lässt `klasseId` stehen. Key nicht committen (`.gitignore`).

### E-Mail-Verifizierung (`AuthContext`, `VerifyEmail`)
- `emailVerified`-State wird in `onAuthStateChanged` aus `u?.emailVerified` gesetzt (lokales ID-Token, **kein** Request). `reload()` triggert `onAuthStateChanged` **nicht** und mutiert das User-Objekt in-place → `reloadVerification()` ruft `auth.currentUser.reload()` und spiegelt `emailVerified` in den State (erzwingt Re-Render + Gate-Weiterschaltung).
- **Kein Auto-Versand in `register()`** – ausschließlich der `VerifyEmail`-Screen sendet (einmal beim Mount, `useRef`-Guard gegen StrictMode-Doppel-Mount). So gibt es garantiert **eine** Mail pro Screen-Besuch, kein Doppelversand. Resend-Button mit 60 s-Cooldown; `too-many-requests` deutsch abgefangen.
- Kein Rules-/Firebase-Deploy nötig. Optional/später ließe sich die Sperre serverseitig über `request.auth.token.email_verified` in den Rules erzwingen – bewusst **nicht** umgesetzt (würde bestehende unverifizierte Sessions hart abschneiden; UI-Sperre reicht).

### Auth-Mails über Resend (`api/auth-email.js`, `api/_emailTemplates.js`, `AuthContext`)
- **Warum:** Firebase-Auth-Templates sind praktisch nicht gestaltbar (kein eigenes HTML/Branding, fixer Absender). Lösung: eigene, im ClassSync-Design gebrandete Mails über **Resend**, aber **Firebases Verifizierungs-/Reset-Mechanik bleibt** – wir tauschen nur den Versandweg.
- **Kernidee:** Die Serverless-Function `api/auth-email.js` (Vercel, Firebase-**Admin**-SDK) erzeugt den Firebase-Action-Link (`generateEmailVerificationLink` / `generatePasswordResetLink`) und verschickt ihn via Resend. Beim Klick landet der Nutzer weiter auf Firebases Action-Handler → `emailVerified` kippt bzw. Passwort wird gesetzt. **Deshalb bleiben `reloadVerification()` und der `emailVerified`-Gate in `App.jsx` unverändert.**
- **Endpoint** (`type: "verify" | "reset"`): *verify* erfordert das `idToken` des eingeloggten Users (`verifyIdToken`) → Mail geht nur an die aus dem Token gelesene Adresse (Missbrauchsschutz); *reset* ist unauthentifiziert und antwortet **immer** generisch `200` (keine User-Enumeration, `user-not-found` geschluckt). Best-effort In-Memory-Rate-Limit. Admin-Init aus Env-Vars mit `getApps()`-Guard.
- **Frontend (`AuthContext`):** `sendVerification`/`resetPassword` rufen in **Prod** den Endpoint (`postAuthEmail` → `/api/auth-email`), in **DEV** (`import.meta.env.DEV`) weiter die Firebase-Standardmail als Fallback – so läuft `npm run dev` ohne `vercel dev`. Endpoint-Fehlercodes werden auf `authErrorText()` gemappt.
- **Env-Vars (Vercel, unpräfixiert):** `RESEND_API_KEY`, `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` (mehrzeilig – im Code `.replace(/\\n/g,"\n")`; im Vercel-Feld **ohne** umschließende Anführungszeichen!). Optional `MAIL_FROM`, `AUTH_CONTINUE_URL`.
- **Lokaler Test ohne Deploy:** `node scripts/test-resend.mjs <email> [verify|reset]` – liest `.env.local`, prüft Admin-Credentials, erzeugt Link, sendet über Resend (dieselbe Kette wie der Endpoint).
- ⚠️ **`api/*` nicht vom SPA-Rewrite schlucken lassen:** `vercel.json`-Rewrite nutzt Negative-Lookahead `"/((?!api/).*)"`; `vite.config.js` hat `workbox.navigateFallbackDenylist: [/^\/api/]`, damit der Service-Worker die API nicht abfängt.

### E-Mail-Adresse ändern (`AuthContext.changeEmail`, `ChangeEmailModal`, `api/auth-email.js`)
- **Flow:** Reauth (`reauthenticateWithCredential` + `EmailAuthProvider.credential`) → **Prod:** `idToken` an den Endpoint (`type:"changeEmail"`, `{ idToken, newEmail }`); **DEV:** `verifyBeforeUpdateEmail(auth.currentUser, newEmail)` (Firebase-Standardmail, damit `npm run dev` ohne `vercel dev` läuft).
- **Endpoint** erzeugt `auth.generateVerifyAndChangeEmailLink(current, newEmail, acs)` (Admin-SDK) und schickt die **gebrandete** Mail (`changeEmailHtml`) an die **neue** Adresse. Vorab-`getUserByEmail(newEmail)`-Check → belegte Adresse gibt `409 email-already-in-use` (**wichtig**, weil der Link-Generator sonst einen kryptischen `INTERNAL ASSERT` statt `auth/email-already-exists` wirft). Rate-Limit-Key `c:${uid}`.
- **Nach Klick** wechselt Firebase die Konto-E-Mail; der **`users.email`-Sync** im Profil-Listener (`AuthContext`, `onSnapshot`) zieht das denormalisierte Feld beim nächsten Snapshot nach (`auth.currentUser.email !== data.email` → `updateDoc`).
- ⚠️ **Man kann nicht auf eine bereits registrierte Adresse wechseln.** Firebase verweigert das; in **DEV** sogar **still** (Enumeration-Schutz) → es kommt gar keine Mail und ggf. kein Fehler. Das ist **erwartetes Verhalten, kein Bug**. Für einen echten End-to-End-Test eine frische Adresse nehmen (z. B. Gmail-`+alias`, gilt als neue Adresse, landet im selben Postfach).
- **Lokaltest ohne Deploy:** `node scripts/test-resend.mjs <neue-email> changeEmail <aktuelle-konto-email>` – erzeugt bei freier Zieladresse einen **echten** Wechsel-Link, bei belegter Zieladresse automatisch einen **Platzhalter-Link** (nur Zustellung/Design werden dann getestet). Braucht die Server-Keys in `.env.local`.

### Account löschen (`lib/authActions.js`, `DeleteAccountModal`, `ProfilPage`, `Onboarding`)
- **Umfang heute: „Mitgliedschaft + Profil".** `deleteAccount({ user, profile, myClasses, currentPassword })`:
  1. **Reauth** (aktuelles Passwort).
  2. **Letzter-Admin-Guard:** Klassen mit `adminIds == [uid]` → Abbruch mit `err.code = "account/last-admin"` + Klassennamen (Löschen blockiert; das Modal zeigt `err.message` direkt, alle anderen Fehler über `authErrorText`).
  3. Pro Klasse in `klasseIds`: aus allen `kurse.memberIds` austreten (`setKursMembership(..., false)`), ggf. aus `adminIds` (`arrayRemove`).
  4. `deleteDoc(users/{uid})` (Rule erlaubt Selbst-Löschen).
  5. `user.delete()` **zuletzt** – danach hat der Client keine Firestore-Rechte mehr, **Reihenfolge ist zwingend**. Bei Erfolg räumt Firebase die Session ab → das Auth-Gate rendert automatisch den Login (kein manuelles Routing).
- **Geteilte Inhalte bleiben** (Materialien, HAs, Prüfungen, Chat, eigene Sammlungen) mit denormalisiertem Nickname erhalten.
- **Erreichbarkeit für ALLE:** Button in der Gefahrenzone am Ende des **Konto-Tabs** der `ProfilPage` (getrennt vom Admin-only „Klasse löschen" im Klassen-Tab; beide nutzen dieselbe `DangerCard`) **und** im **Onboarding** („Konto löschen"), damit auch **klassenlose** Nutzer löschen können (das Gate zeigt bei `klasseIds`-leer nur das Onboarding). Deshalb bekommt `DeleteAccountModal` `myClasses` als **Prop** (nicht aus `useMemberships`) – im Onboarding gibt es keinen `MembershipsProvider`; dort ist `myClasses={[]}`.
- **Rule-Änderung:** `users` `allow delete: if isAuth() && uid()==userId` (war `false`).

### DSGVO-Voll-Wipe (geplant – Anleitung zum Umbau)
> Ziel: beim Kontolöschen **alle** vom Nutzer erzeugten personenbezogenen Daten entfernen, nicht nur Mitgliedschaft/Profil. Die Erweiterungs-**Naht** liegt in `lib/authActions.js` (markiertes `TODO` in der Klassen-Schleife).

**uid-/Personen-Fußabdruck (alle Stellen, an denen uid, Nickname oder Inhalte hängen):**
- `users/{uid}` – Doc selbst (heute schon gelöscht).
- `klassen/{k}`: `adminIds[]`, `bannedIds[]`, `bannedInfo[uid]`, `migration.memberIds[]`.
- `klassen/{k}/kurse/{c}`: `erstellerId`, `erstellerNick`, `memberIds[]`.
- `…/materialien/*`: `autorId`, `autor` (Nick), `likes[]` – **plus Storage-Datei** unter `storagePath`.
- `…/hausaufgaben/*`: `autorId`, `autor`, `doneBy[]`, `hiddenBy[]`.
- `…/pruefungen/*`: `autorId`, `autor`.
- `…/chat/*`: `autorId`, `autor`, `text`.
- `…/sammlungen/*`: `ownerId`, `ownerNick`, `memberIds[]`.

**Was clientseitig geht (Rules erlauben es Autor/Mitglied schon heute):** eigene **Materialien** löschen (`autorId==uid`) inkl. Storage (`deleteObject(storagePath)`), **HAs**/**Prüfungen** löschen, **eigene Sammlungen** löschen (`ownerId==uid`) bzw. aus geteilten austreten (`sammlungActions.leaveSammlung`), sowie `likes`/`doneBy`/`hiddenBy`/`memberIds` per `arrayRemove(uid)` bereinigen (diese Felder darf jedes Mitglied ändern).

**Was clientseitig NICHT geht → braucht einen Admin-SDK-Endpoint:**
- **Chat hart löschen:** Autoren dürfen nur *tombstone* (`update deleted:true`), **kein `delete`** (Rule: nur Klassen-/Kurs-Admin). Für echte Löschung Admin-SDK.
- **Fremd-Klassen-Referenzen:** `bannedIds`/`bannedInfo`/`migration.memberIds` in Klassen, in denen der Nutzer **kein Admin** ist, kann der Client nicht schreiben.
- **Vom Nutzer erstellte Kurse** (`erstellerId==uid`): entweder kaskadierend löschen (`deleteKurs` – betrifft dann Inhalte **anderer**!) oder `erstellerId` neu zuweisen → **bewusste Design-Entscheidung**.
- **Letzter-Admin-Klassen:** heute blockiert; für den Voll-Wipe entscheiden, ob sie **auto-kaskadierend gelöscht** werden (`deleteKlasse`) oder der Block bleibt.

**Empfohlene Architektur – neuer Endpoint `api/delete-account.js`** (analog `api/auth-email.js`; gleiche Admin-Env-Vars `FIREBASE_PROJECT_ID/CLIENT_EMAIL/PRIVATE_KEY`; `getApps()`-Guard; zusätzlich `firebase-admin/firestore` + `firebase-admin/storage` mit Bucket `classsync-v2.firebasestorage.app`):
1. `verifyIdToken` (Client reautht vorher per Passwort → frisches Token).
2. Admin (umgeht Rules): pro Klasse des Nutzers alle Subcollections nach `autorId==uid` löschen (**Chat hart**), Storage-Dateien via `storagePath`/`listAll` entfernen, eigene Sammlungen löschen, `likes/doneBy/hiddenBy/memberIds/adminIds/bannedIds/bannedInfo/migration.memberIds` bereinigen.
3. Kurse mit `erstellerId==uid` gemäß Design-Entscheidung behandeln.
4. `users/{uid}` löschen, dann `admin.auth().deleteUser(uid)`.
5. Client: nach `200` `signOut()` (Session serverseitig bereits invalidiert).
- **Alternativ hybrid:** Client löscht die author-eigenen Docs (Rules erlauben es) und der Endpoint macht nur **Chat-Hard-Delete + Fremd-Referenzen + Auth-Delete**. Ein **einziger** Admin-Endpoint ist aber robuster/atomarer.
- **Muster wiederverwenden:** `deleteSubcollection`/`deleteKurs`/`deleteKlasse` (Batching, Storage-`listAll`, `stepError`-Kontext) aus `lib/klasseActions.js` als Vorlage; den Reauth-Flow aus `authActions.deleteAccount`. Rechte-/Kaskaden-Merksatz beachten: **man kann nur löschen, was man auch lesen darf** (Admin-SDK umgeht das, aber die Reihenfolge Kurs-/Klassen-Doc **zuletzt** gilt weiterhin, falls doch Rules greifen).

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
`deleteKurs`: Storage-`listAll` + `deleteObject` (try/catch) → Subcollections `materialien/hausaufgaben/pruefungen/chat` in 450er-`writeBatch`es → Kurs-Doc. `deleteKlasse`: alle Kurse via `deleteKurs` → **Sammlungen-Subcollection** → Klassen-Doc. Reihenfolge wichtig: Kurs-/Klassen-Doc **zuletzt**, weil die Rules (`isKursAdmin`/`isKlassenAdmin`) sie per `get()` noch lesen müssen. **Jede Stufe wirft mit Kontext** (`stepError`, z. B. „Lesen von klassen/…/sammlungen (permission-denied)") – so ist ein Rule-Problem sofort lokalisierbar. Merksatz: **man kann nur löschen, was man auch lesen (auflisten) darf** → für jede cascade-gelöschte Subcollection Admin-**read** UND -**delete** in den Rules sicherstellen (s. §8, Sammlungen-Bug). `ConfirmDialog` schluckt Fehler → `ProfilPage` zeigt die Meldung selbst in der Gefahrenzone an.

### Rauswurf bei gelöschter/gesperrter Klasse (Multi-Klassen)
`MembershipsContext` beobachtet **alle** eigenen Klassen-Docs; existiert eines nicht mehr **oder** steht die eigene uid in dessen `bannedIds` → `updateProfile({ klasseIds: arrayRemove(id), activeKlasseId: … })`. Betrifft es die aktive Klasse, greift danach eine verbleibende oder das Onboarding. Funktioniert live für alle eingeloggten Mitglieder. (Der `KlasseContext` setzt für die **aktive** Klasse nur noch `klasse=null`; die Eviction liegt zentral im MembershipsContext.)

### Mitglieder-Moderation (`lib/klasseActions.js`, `components/profil/MitgliederListe.jsx`, `KursMitgliederModal`)
- **Warum `bannedIds` am Klassen-Doc statt Schreiben ins fremde User-Doc?** Die `users`-Rules erlauben nur das Bearbeiten des *eigenen* Docs – ein Admin kann die `klasseIds` fremder User gar nicht ändern. Also editiert der Admin nur das Klassen-Doc (`banFromKlasse`: uid in `bannedIds`, raus aus `adminIds` + allen `memberIds`, Nickname in `bannedInfo`), und der Betroffene wirft sich per `MembershipsContext`-Listener selbst raus – dasselbe Muster wie beim Klassen-Löschen (und, invertiert, bei der Migration).
- **Rejoin-Sperre doppelt:** serverseitig über die `users`-Update-Rule (Ban-Check auf die neu hinzukommende `activeKlasseId` per Set-`difference`) **und** clientseitig als Pre-Check in `joinByCode`/`acceptMigration` **vor** dem `updateDoc`. Der Client-Check ist nötig für die UX: ein direkter Write würde erst **optimistisch lokal** angewendet → kurzer Render → Server-Rollback **ohne** Fehlermeldung. Der Pre-Check wirft vorher eine klare Meldung.
- **`leaveKlasse(klasseId, uid, kurse, isAdmin, klasseIds, activeKlasseId)`:** raus aus allen eigenen Kursen, dann (nur wenn `isAdmin`) aus `adminIds`, zuletzt `klasseIds: arrayRemove(klasseId)` + `activeKlasseId` auf eine verbleibende/null. Der `isAdmin`-Guard ist Pflicht – ein Nicht-Admin darf das Klassen-Doc nicht schreiben, sonst würde der `adminIds`-Write mit permission-denied den User-Write verhindern. *Nur die aktive Klasse verlassbar (kurse-Liste geladen).*
- **Kurs-Entfernen** braucht keine eigene Funktion/Rule: `setKursMembership(…, false)` mit fremder uid; die `kurse`-Update-Rule erlaubt Admin/Ersteller bereits jede `memberIds`-Änderung.
- Gesperrte, die sich noch nicht selbst evictet haben, matchen weiter die Mitglieder-Query (`klasseIds array-contains`) → in `MitgliederListe` **ausgegraut/durchgestrichen mit „Gesperrt"-Tag** (und ohne Aktionsmenü). Kurs-Modal ist nicht betroffen (uid schon aus `memberIds` entfernt).

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

### Profilseite (Tab-Struktur, `components/profil/`)
Die Seite war bis Juli 2026 **508 Zeilen in einer Datei**: sechs gestapelte Karten, ein sehr langer Scroll. Sie ist so gewachsen, weil E-Mail-Wechsel, Multi-Klassen, Migrations-Einladungen, Ban/Unban, UI-Skalierung und Account-Löschen nacheinander dazukamen und jeweils an der nächstbesten Stelle angehängt wurden. Umbau: **gleiche Features und Buttons, neue Gliederung** – keine Verhaltens-, Firestore- oder Rules-Änderung.

- **`ProfilPage.jsx` ist nur noch Container** (~150 Zeilen): Tab-State, der `mitglieder`-Listener und **alle** Modals/ConfirmDialogs. Alles Sichtbare liegt in `components/profil/`. Bei neuen Profil-Features: **Baustein dort anlegen, nicht die Seite verlängern.**
- **Tabs:** `konto` (default) / `klassen` / `mitglieder`, lokaler `useState` – **kein Routing**, die Seite hat keine tiefen Links. Das Einladungs-Badge am Klassen-Tab kommt aus `openMigrations.length` und bleibt neutral (`badgeTone`-Default); rot ist im Kurs den offenen HAs/Prüfungen vorbehalten.
- **Konventionen, die den Umbau tragen** (beim Erweitern beibehalten):
  - Eine *primäre* Aktion pro Karte gehört in `SectionTitle action=`. Alles andere in eine `SettingRow` oder eine Button-Reihe am Kartenfuß – **keine Buttons frei hinter einem `<Divider/>` im Fließtext**, das war die Hauptquelle der Unordnung.
  - Auswahlen mit festen Optionen (Design, UI-Größe) als `SegmentedControl`, nicht als Button-Reihe. Der Design-Toggle zeigt deshalb `Hell`/`Dunkel` mit aktiver Markierung statt eines Buttons, dessen Label die *Gegen*aktion nennt.
  - Unwiderrufliche Aktionen immer über `DangerCard` (eine Komponente, pro Tab kontextuell gerendert) – nicht als weitere rote Karte am Seitenende.
  - Warntexte **kurz halten**: der vollständige Wortlaut steht ohnehin im `ConfirmDialog`/`DeleteAccountModal`. Ausnahme: der Letzter-Admin-Hinweis bleibt inline, weil er eine *Sperre* erklärt und nicht nur warnt.
- **Overflow-Menü in `MitgliederListe`:** Admin-Aktionen (Zum Admin / Admin entfernen / Entfernen & sperren) liegen hinter `MoreVertical` statt als bis zu drei Buttons je Zeile. Gebaut nach dem Muster aus `ChatPanel.jsx` (absolutes Popover, Schließen per Außenklick + Escape). Die Sichtbarkeits-Bedingungen sind unverändert; die Zeile für den **letzten Admin** bekommt kein Menü, sondern weiterhin den Text „letzter Admin".
- Die Seite ist **kein Vollbild-Overlay** → keine eigene Safe-Area-Behandlung, der `PAGE_PAD`-Container reicht.

### Responsive-Verhalten
- `< 768px`: Sidebar als Overlay-Drawer (Hamburger in mobiler TopBar), schließt bei Navigation
- `768–1199px` (`useIsTablet`): Layout wie Desktop, aber die **UI-Skalierung** greift automatisch mit 1.15x (s. „UI-Skalierung & Safe-Area"). Der Hook steuert **nur** die Skalierung, nicht das Layout
- `≥ 1200px` (`useIsWide`): KursPage zweispaltig – links Materialien/Chat-Tabs, rechts HA + Prüfungen; Tab-State fällt beim Umschalten auf breit automatisch auf „material" zurück (Edge-Case behandelt in `KursPage.jsx`)

---

## 10. Bekannte Limitierungen & TODOs

- **Multi-Klassen: nur EINE aktive Klasse** gleichzeitig sichtbar (bewusst – hält den Feature-Code single-class). Kein gleichzeitiger Blick über alle Klassen. **Klasse verlassen** geht nur für die aktive Klasse (sonst fehlt die geladene Kursliste zum Aufräumen). Beim Wechsel remountet der Baum kurz (Spinner).
- **Feld-Migration:** neu registrierte/ eingeloggte User sind sofort auf `klasseIds`; noch nie eingeloggte Alt-User erscheinen erst nach dem **einmaligen Backfill** (`scripts/backfill-klasseids.mjs`) in fremden Mitgliederlisten (die Lazy-Migration greift erst bei deren nächstem Login).
- **Account-Löschung = „Mitgliedschaft + Profil"** (geteilte Inhalte bleiben mit Nickname erhalten). Der **DSGVO-Voll-Wipe** (alle Autor-Inhalte + Chat-Hard-Delete + Fremd-Referenzen) ist noch **offen** – kompletter Umbauplan inkl. uid-Fußabdruck und `api/delete-account.js`-Architektur in §9 „DSGVO-Voll-Wipe (geplant)".
- **E-Mail-Wechsel** nur auf **freie** Adressen (Firebase-Vorgabe); in DEV verweigert Firebase belegte Adressen still (kein Fehler/keine Mail).
- **UI-Skalierung ist `zoom`-basiert**, nicht rem: Sie skaliert alles proportional, macht das Layout aber nicht *anders* (keine anderen Umbrüche, keine größeren Touch-Ziele relativ zum Rest). Die **Landingpage skaliert mit**, weil sie sich `#root` mit der App teilt – auf dem Tablet ist also auch `classsync.de` 15 % größer. Bei „Groß" (1.3x) sinkt die nutzbare Layout-Breite spürbar (s. §9, `matchMedia`-Hinweis). Ein echter Token-/rem-Umbau bleibt die saubere, aber teure Alternative (700+ Literale)
- **Schmale Handy-Bildschirme sind noch nicht gut** (Stand Juli 2026, bewusst zurückgestellt). Die App ist auf iPad/Desktop optimiert; unter 768px greift zwar der Drawer-Modus, aber Dichte und Layout sind dort nicht durchgestaltet. Die Safe-Area-Werte des iPhone (Header 59px, Fußzeile 34px) sind bisher nur **gerechnet, nicht auf dem Gerät geprüft** – sie können nicht zu klein ausfallen (`max()` garantiert ≥ Inset), aber der Inhalt sitzt exakt auf der sicheren Kante ohne optischen Puffer. Sinnvoll zusammen mit einer echten Handy-Überarbeitung anzugehen, nicht isoliert
- **Keine Push-Notifications** – nur In-App (FCM wäre der nächste Schritt, braucht Blaze-Plan)
- **Keine Offline-Unterstützung**
- **Max. Dateigröße 10 MB** (`MAX_MB` in `UploadModal.jsx` + Storage-Rules – beide Stellen ändern!)
- **Sammlungen:** `items` liegen als Array im Sammlung-Doc (klein gedacht, für Prüfungs-Bündel völlig ausreichend). Bei sehr großen Sammlungen wäre eine Subcollection sinnvoller. Verwaiste Item-Referenzen (gelöschtes Material) werden beim Auflösen als „nicht verfügbar" behandelt, nicht automatisch bereinigt.
- **Rate-Limit der Auth-Mail-Function ist In-Memory** (pro warmer Serverless-Instanz, best-effort) – kein harter, instanzübergreifender Schutz. Für echten Missbrauchsschutz später ein persistenter Store/Provider-Limit.
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
git add . && git commit -m "beschreibung" && git push origin main   # → Auto-Deploy nach Production
```
Auto-Deploy ist verbunden (s. §2): Push auf `main` → Production, Branch-Push → Preview. **Empfohlener Weg für nichttriviale/Backend-Änderungen:** Feature-Branch pushen → Preview testen → nach `main` mergen. Die **Serverless-Functions unter `api/`** werden von Vercel automatisch mitgebaut (brauchen die Server-Env-Vars, s. §12). Beachten: **`api/*` hängt nicht am Hostname-Routing** – der Endpoint ist auf jeder Domain erreichbar. Die React-App zeigt auf der Preview-`*.vercel.app` weiterhin die Landing (Host ≠ `app.*`); für die **App** auf der Preview `?app=1` anhängen, s. §9 „Hostname-Routing".
Hinweis aus der Praxis: Vercel-Builds schlugen vereinzelt mit „Unexpected error" **vor** dem Build-Step fehl (Infrastruktur-Aussetzer). Lösung: einfach erneut deployen.

### Rules ändern
`firestore.rules` / `storage.rules` im Repo bearbeiten → Inhalt in der Firebase Console einfügen → Veröffentlichen. (Es gibt kein automatisches Rules-Deployment.)

---

## 12. Environment Variables

**Client (Browser, `VITE_`-Präfix → via `import.meta.env`):**
```
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN            = classsync-v2.firebaseapp.com
VITE_FIREBASE_PROJECT_ID             = classsync-v2
VITE_FIREBASE_STORAGE_BUCKET         = classsync-v2.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
```
**Server (nur `api/`, UNPRÄFIXIERT – dürfen NICHT ins Client-Bundle):**
```
RESEND_API_KEY                       ← Resend API-Key
FIREBASE_PROJECT_ID  = classsync-v2  ← Admin-SDK
FIREBASE_CLIENT_EMAIL                ← aus Service-Account-JSON (client_email)
FIREBASE_PRIVATE_KEY                 ← aus JSON (private_key); mehrzeilig, Code macht .replace(/\n/g,"\n").
                                       Im Vercel-Feld OHNE umschließende Anführungszeichen; in .env.local MIT "…".
MAIL_FROM         (optional)         ← Default: ClassSync <noreply@mail.classsync.de>
AUTH_CONTINUE_URL (optional)         ← Default: https://app.classsync.de
```
- Lokal: `.env.local` (gitignored; enthält zusätzlich ein harmloses `VERCEL_OIDC_TOKEN`). Die Server-Keys hier ermöglichen den lokalen Test via `scripts/test-resend.mjs`. `npm run dev` selbst nutzt sie nicht (DEV-Fallback auf Firebase-Mails).
- Produktiv: **Client-Vars** in allen Environments; **Server-Vars** mindestens in Production + Preview.
- Ohne Firebase-Client-Keys zeigt die App den Setup-Hinweis (crasht nicht). Fehlen die Server-Vars, antwortet der Mail-Endpoint mit `server-not-configured` (500).

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
- `<Modal width onClose noPad>` – Overlay-Modal (Escape + Backdrop-Klick schließen; `onClose=undefined` sperrt Schließen während busy). Overlay-Padding nutzt `safePad` und die Höhe `vhScaled(92)` – s. §9 „UI-Skalierung & Safe-Area"
- `<ModalHeader title subtitle onClose>`
- `<Pill label color>` / `<Tag label bg fg>` – farbige Badges
- `<Divider>` / `<SectionTitle action>` / `<Spinner size center>` / `<Card hover onClick>`
- `<Empty icon={LucideIcon} text sub action>` – icon nimmt eine Lucide-Komponente (oder fertiges Element)
- `<CloseButton onClick>` – einheitlicher Schließen-Button (X)
- `<LogoMark size>` – flaches Logo-Mark (GraduationCap auf Akzent-Quadrat)
- `<TabBar tabs={[{id,label,icon,badge}]} active onChange badgeTone>` (eigene Datei) – Pill-Tabs, genutzt von `KursPage` und `ProfilPage`. **`badgeTone="danger"`** färbt den Zähler rot („da liegt was an": offene HAs/Prüfungen im Kurs), Default **`"neutral"`** ist eine reine Anzahl (offene Einladungen im Profil). Neue Tab-Leisten hier anschließen, nicht neu bauen
- `<CourseAvatar name farbe size radius>` (eigene Datei) – Kurs-Monogramm
- `<DateiIcon typ size color>` (eigene Datei) – PDF/Bild/Notiz-Icon

Alle Komponenten holen sich die Design-Tokens über `useTheme()` → `t`. Lucide-Icons: `size` 13–19 je nach Kontext, `strokeWidth 1.8` (Buttons/Nav) bzw. 2+ (Checks). Größen bleiben **feste px-Zahlen** – die globale Vergrößerung läuft über den `zoom` am `#root`, nicht über die Komponenten (s. §9).
