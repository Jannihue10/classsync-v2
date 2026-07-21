import { addDoc, arrayUnion, collection, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { deleteObject, ref as storageRef } from "firebase/storage";
import { db, storage } from "./firebase";
import { dateToISO, parseDatum, toDate } from "./dates";

// Ankündigungen liegen auf Klassenebene (analog zu sammlungen) – sie sind der einzige
// klassenweite Kanal; alles andere im Projekt ist kurs-skopiert.
//
// kursIds ist ein ZIELGRUPPEN-Filter, keine Zugriffsschranke: die Read-Rule erlaubt
// jedem Klassenmitglied zu lesen (wie bei materialien/chat), gefiltert wird in der UI –
// und zwar ausschließlich über sichtbarFuer() weiter unten.

// Aufbewahrung; danach räumt api/purge-ankuendigungen.js (Vercel-Cron, Admin-SDK)
// Doc + Storage-Datei ab. expiresAt wird beim Anlegen mitgeschrieben, damit der Cron
// mit einer einzigen collectionGroup-Query auskommt.
export const RETENTION_DAYS = 90;
const TAG_MS = 24 * 60 * 60 * 1000;

// Neuere Ankündigungen gelten als „aktuell", ältere wandern ins Archiv.
export const ARCHIV_AB_TAGEN = 30;

const ankRef = (klasseId, ankId) =>
  doc(db, "klassen", klasseId, "ankuendigungen", ankId);

// Ende eines Termins in Millisekunden – der ganze letzte Tag zählt noch dazu.
export function terminEndeMs(termin) {
  const iso = parseDatum(termin?.bis) || parseDatum(termin?.von);
  const d = iso ? toDate(iso) : null;
  return d ? d.getTime() + TAG_MS - 1 : null;
}

// Bezugspunkt für Archiv- und Ablauffrist: das SPÄTERE aus Erstellung und Terminende.
// Sonst rutscht die Klassenfahrt-Ankündigung ins Archiv (oder wird gelöscht), bevor die
// Fahrt überhaupt stattgefunden hat – der Kalendereintrag bliebe stehen, die Details weg.
export function bezugsZeit(ank) {
  return Math.max(ank.createdAt || 0, terminEndeMs(ank.termin) || 0);
}

export function createAnkuendigung(klasseId, data) {
  const createdAt = Date.now();
  const basis = Math.max(createdAt, terminEndeMs(data.termin) || 0);
  return addDoc(collection(db, "klassen", klasseId, "ankuendigungen"), {
    titel: data.titel.trim(),
    text: (data.text || "").trim(),
    autor: data.autor,
    autorId: data.autorId,
    // null = ganze Klasse. Eine explizite Liste schränkt auf Mitglieder dieser Kurse ein.
    kursIds: data.kursIds || null,
    // Namen denormalisiert, damit „Nur für: …" auch nach dem Löschen eines Kurses hält
    kursNamen: data.kursNamen || null,
    dateiUrl: data.dateiUrl || null,
    storagePath: data.storagePath || null,
    dateiTyp: data.dateiTyp || null,
    dateiName: data.dateiName || null,
    termin: data.termin || null,
    // Der Autor hat seine eigene Ankündigung offensichtlich gelesen – sonst poppt sie
    // ihm direkt nach dem Veröffentlichen ins Gesicht (vgl. „eigene Uploads nicht melden").
    gelesenVon: [data.autorId],
    createdAt,
    // Frist läuft ab dem Terminende, falls das später liegt als das Erstelldatum
    expiresAt: basis + RETENTION_DAYS * TAG_MS,
  });
}

export function markGelesen(klasseId, ankId, uid) {
  return updateDoc(ankRef(klasseId, ankId), { gelesenVon: arrayUnion(uid) });
}

// Bearbeiten durch einen Klassen-Admin (die Rules lassen Admins alle Felder ändern).
//
// `expiresAt` wird IMMER neu gerechnet: verschiebt sich der Termin, verschiebt sich auch
// die Frist – sonst behielte die Ankündigung die Frist des ursprünglichen Termins.
//
// erneutBenachrichtigen: setzt gelesenVon zurück, das Popup erscheint dann bei allen
// wieder – nur nicht beim Bearbeitenden selbst. Ohne das Flag bleibt die Bearbeitung
// still; sichtbar wird sie über den editedAt-Marker (Muster aus dem Chat).
export async function updateAnkuendigung(klasseId, ank, data, optionen = {}) {
  const { erneutBenachrichtigen = false, editorUid } = optionen;
  const basis = Math.max(ank.createdAt || 0, terminEndeMs(data.termin) || 0);

  const patch = {
    titel: data.titel.trim(),
    text: (data.text || "").trim(),
    kursIds: data.kursIds || null,
    kursNamen: data.kursNamen || null,
    termin: data.termin || null,
    expiresAt: basis + RETENTION_DAYS * TAG_MS,
    editedAt: Date.now(),
  };
  // Anhang nur anfassen, wenn er wirklich gewechselt oder entfernt wurde – sonst
  // würde ein simpler Titel-Edit die Datei-Felder unnötig überschreiben.
  if (data.dateiGeaendert) {
    patch.dateiUrl = data.dateiUrl || null;
    patch.storagePath = data.storagePath || null;
    patch.dateiTyp = data.dateiTyp || null;
    patch.dateiName = data.dateiName || null;
  }
  if (erneutBenachrichtigen) patch.gelesenVon = editorUid ? [editorUid] : [];

  await updateDoc(ankRef(klasseId, ank.id), patch);

  // Alte Datei ERST nach dem erfolgreichen Write löschen – andersherum zeigte das Doc
  // bei einem Fehler auf eine nicht mehr existierende Datei.
  if (data.dateiGeaendert && ank.storagePath && ank.storagePath !== patch.storagePath) {
    await deleteObject(storageRef(storage, ank.storagePath)).catch(() => {});
  }
}

// Manuelles Löschen durch einen Klassen-Admin: erst Storage-Datei, dann Doc (wie deleteMaterial)
export async function deleteAnkuendigung(klasseId, ank) {
  if (ank.storagePath) {
    await deleteObject(storageRef(storage, ank.storagePath)).catch(() => {});
  }
  await deleteDoc(ankRef(klasseId, ank.id));
}

// Die EINZIGE Stelle, an der die Zielgruppe ausgewertet wird (Context, Kalender, Seite).
export function sichtbarFuer(ank, meineKursIds) {
  if (!ank.kursIds || ank.kursIds.length === 0) return true;
  return ank.kursIds.some((id) => meineKursIds.includes(id));
}

export function istGelesen(ank, uid) {
  return Boolean(ank.gelesenVon?.includes(uid));
}

// Alle ISO-Tage, die ein Termin belegt (von..bis einschließlich). Ohne „bis" ein Tag.
// Sicherheitsnetz gegen vertippte Zeiträume: max. 60 Tage.
export function terminTage(termin) {
  const von = parseDatum(termin?.von);
  if (!von) return [];
  const bis = parseDatum(termin.bis) || von;
  const start = toDate(von);
  const ende = toDate(bis);
  if (!start || !ende || ende < start) return [von];
  const tage = [];
  const cur = new Date(start);
  while (cur <= ende && tage.length < 60) {
    tage.push(dateToISO(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return tage;
}

// Anzeige-Label eines Termins, z. B. „12.05.2026 – 15.05.2026 · 08:00"
export function terminLabel(termin, formatDatum) {
  if (!termin?.von) return "";
  const teile = [formatDatum(termin.von)];
  if (termin.bis && termin.bis !== termin.von) teile.push(`– ${formatDatum(termin.bis)}`);
  const datum = teile.join(" ");
  return termin.zeit ? `${datum} · ${termin.zeit} Uhr` : datum;
}
