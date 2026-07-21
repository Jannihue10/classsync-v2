// Wegwerf-Testskript: fährt den Ankündigungs-Purge lokal gegen das echte Firestore,
// ohne Deploy – dieselbe Kette wie api/purge-ankuendigungen.js.
//   node scripts/test-purge.mjs --dry-run    (nur zählen, nichts löschen)
//   node scripts/test-purge.mjs              (wirklich löschen)
// Liest die Admin-Credentials aus .env.local (FIREBASE_PROJECT_ID/CLIENT_EMAIL/PRIVATE_KEY).
//
// Zum Testen in der Firebase Console `expiresAt` einer Ankündigung auf einen Wert in der
// Vergangenheit setzen (Millisekunden seit 1970, z. B. 1000000000000).
//
// Braucht KEINEN manuell angelegten Index – der Endpoint fragt bewusst je Klasse ab
// statt per collectionGroup (Begründung im Kopf von api/purge-ankuendigungen.js).
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));

// .env.local minimal parsen (nur KEY=VALUE, Quotes entfernen) – wie test-resend.mjs
for (const line of readFileSync(join(here, "..", ".env.local"), "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)$/);
  if (!m) continue;
  let v = m[2].trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    v = v.slice(1, -1);
  }
  process.env[m[1]] = v;
}

if (!process.env.FIREBASE_PRIVATE_KEY) {
  console.error("FIREBASE_PRIVATE_KEY fehlt in .env.local – Admin-Credentials nötig.");
  process.exit(1);
}

// Erst NACH dem Setzen der Env-Vars importieren: das Modul liest sie beim Init.
const { purgeAbgelaufene } = await import("../api/purge-ankuendigungen.js");

const dryRun = process.argv.includes("--dry-run");
try {
  const ergebnis = await purgeAbgelaufene({ dryRun });
  console.log(dryRun ? "DRY RUN – nichts gelöscht:" : "Purge fertig:", ergebnis);
} catch (e) {
  console.error("Purge fehlgeschlagen:", e?.message || e);
  process.exit(1);
}
