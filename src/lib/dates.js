// Datums-Helfer. Intern immer "YYYY-MM-DD" (HTML date input), Anzeige "DD.MM.YYYY".

export const WOCHENTAGE = ["Mo", "Di", "Mi", "Do", "Fr"];
export const WOCHENTAGE_LANG = {
  Mo: "Montag", Di: "Dienstag", Mi: "Mittwoch", Do: "Donnerstag", Fr: "Freitag",
};

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

// Countdown-Label für Prüfungen
export function tageLabel(tage) {
  if (tage === null) return "";
  if (tage < 0) return "vorbei";
  if (tage === 0) return "heute!";
  if (tage === 1) return "morgen";
  return `in ${tage} Tagen`;
}
