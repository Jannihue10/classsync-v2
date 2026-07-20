// Datums-Helfer. Intern immer "YYYY-MM-DD" (HTML date input), Anzeige "DD.MM.YYYY".

export const WOCHENTAGE = ["Mo", "Di", "Mi", "Do", "Fr"];
export const WOCHENTAGE_LANG = {
  Mo: "Montag", Di: "Dienstag", Mi: "Mittwoch", Do: "Donnerstag", Fr: "Freitag",
};
// Kürzel -> JS getDay() (0 = So)
export const TAG_INDEX = { Mo: 1, Di: 2, Mi: 3, Do: 4, Fr: 5 };

// "YYYY-MM-DD" -> "DD.MM.YYYY"
export function formatDatum(datum) {
  if (!datum) return null;
  const iso = parseDatum(datum);
  if (!iso) return datum;
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}

// Akzeptiert "YYYY-MM-DD" und "DD.MM.YYYY", liefert "YYYY-MM-DD" oder null
export function parseDatum(datum) {
  if (!datum) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(datum)) return datum;
  const m = datum.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  return null;
}

export function toDate(datum) {
  const iso = parseDatum(datum);
  if (!iso) return null;
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

// Tage bis zum Datum (0 = heute, negativ = vergangen)
export function calcTage(datum) {
  const target = toDate(datum);
  if (!target) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.round((target - today) / (1000 * 60 * 60 * 24));
}

export function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function dateToISO(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Relative Zeit für Timestamps (Firestore Timestamp | Date | ms)
export function relativeTime(ts) {
  if (!ts) return "";
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  const diff = Date.now() - date.getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "gerade eben";
  if (min < 60) return `vor ${min} Min.`;
  const h = Math.floor(min / 60);
  if (h < 24) return `vor ${h} Std.`;
  const d = Math.floor(h / 24);
  if (d === 1) return "gestern";
  if (d < 7) return `vor ${d} Tagen`;
  return date.toLocaleDateString("de-DE");
}

export function formatUhrzeit(ts) {
  if (!ts) return "";
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  return date.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
}

// ISO-Kalenderwoche
export function getKW(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
}

// Montag der Woche, in der `date` liegt
export function mondayOf(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0 = So
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  return d;
}

// "HH:MM" -> Minuten seit Mitternacht
export function timeToMin(zeit) {
  if (!zeit) return null;
  const [h, m] = zeit.split(":").map(Number);
  if (Number.isNaN(h)) return null;
  return h * 60 + (m || 0);
}

// Die nächsten Kurstermine ab jetzt – [{ iso, day, zeit }], höchstens einer pro Tag.
// Eine Stunde, die heute schon begonnen hat, zählt nicht mehr mit: wer während des
// Unterrichts eine HA einträgt, meint den nächsten Termin, nicht den laufenden.
export function naechsteStunden(zeiten, count = 2, from = new Date()) {
  const tage = (zeiten || []).filter((z) => TAG_INDEX[z?.day] && z?.zeit);
  if (tage.length === 0) return [];

  const jetzt = from.getHours() * 60 + from.getMinutes();
  const start = new Date(from);
  start.setHours(0, 0, 0, 0);

  const treffer = [];
  for (let i = 0; i < 14 && treffer.length < count; i++) {
    const tag = new Date(start);
    tag.setDate(tag.getDate() + i);
    const passend = tage
      .filter((z) => TAG_INDEX[z.day] === tag.getDay())
      .filter((z) => i > 0 || timeToMin(z.zeit) > jetzt)
      .sort((a, b) => timeToMin(a.zeit) - timeToMin(b.zeit));
    if (passend.length > 0) {
      treffer.push({ iso: dateToISO(tag), day: passend[0].day, zeit: passend[0].zeit });
    }
  }
  return treffer;
}

// Countdown-Label für Prüfungen
export function tageLabel(tage) {
  if (tage === null) return "";
  if (tage < 0) return "vorbei";
  if (tage === 0) return "heute!";
  if (tage === 1) return "morgen";
  return `in ${tage} Tagen`;
}
