/**
 * Einmaliges Backfill für das Multi-Klassen-Update.
 *
 * Setzt für ALLE bestehenden User-Dokumente die neuen Felder
 *   klasseIds:      [klasseId]  (bzw. [] wenn klasseId null/fehlt)
 *   activeKlasseId: klasseId    (bzw. null)
 * abgeleitet aus dem alten Einzelfeld `klasseId`. Nur Dokumente OHNE `klasseIds`
 * werden angefasst -> das Skript ist idempotent und mehrfach ausführbar.
 * Das alte Feld `klasseId` bleibt unangetastet (wird von den Rules ignoriert).
 *
 * Läuft mit dem Firebase-Admin-SDK und umgeht damit die Security-Rules
 * (nötig, weil ein Client fremde User-Dokumente nicht schreiben darf).
 *
 * Nutzung (im Projektordner):
 *   1) Service-Account-Key holen: Firebase Console -> Projekteinstellungen
 *      -> Dienstkonten -> "Neuen privaten Schlüssel generieren" -> JSON speichern,
 *      z. B. als  serviceAccountKey.json  (NICHT committen!).
 *   2) npm install --no-save firebase-admin
 *   3) Testlauf (schreibt nichts):
 *        node scripts/backfill-klasseids.mjs ./serviceAccountKey.json --dry-run
 *      Echtlauf:
 *        node scripts/backfill-klasseids.mjs ./serviceAccountKey.json
 *
 * Alternativ statt Pfad-Argument: Umgebungsvariable GOOGLE_APPLICATION_CREDENTIALS.
 */
import { readFileSync } from "node:fs";
import { initializeApp, cert, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const keyPath = args.find((a) => !a.startsWith("--"));

if (keyPath) {
  const serviceAccount = JSON.parse(readFileSync(keyPath, "utf8"));
  initializeApp({ credential: cert(serviceAccount) });
} else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  initializeApp({ credential: applicationDefault() });
} else {
  console.error(
    "Kein Service-Account-Key. Pfad als Argument übergeben oder GOOGLE_APPLICATION_CREDENTIALS setzen."
  );
  process.exit(1);
}

const db = getFirestore();

async function run() {
  const snap = await db.collection("users").get();
  console.log(`${snap.size} User-Dokumente gefunden.${dryRun ? "  [DRY-RUN]" : ""}`);

  let updated = 0;
  let skipped = 0;
  let batch = db.batch();
  let inBatch = 0;

  for (const doc of snap.docs) {
    const data = doc.data();
    // Bereits migriert -> überspringen (idempotent)
    if (data.klasseIds !== undefined) {
      skipped++;
      continue;
    }
    const legacy = data.klasseId ?? null;
    const patch = {
      klasseIds: legacy ? [legacy] : [],
      activeKlasseId: legacy,
    };
    console.log(`  ${doc.id}: klasseId=${legacy} -> klasseIds=${JSON.stringify(patch.klasseIds)}`);

    if (!dryRun) {
      batch.update(doc.ref, patch);
      inBatch++;
      if (inBatch >= 450) {
        await batch.commit();
        batch = db.batch();
        inBatch = 0;
      }
    }
    updated++;
  }

  if (!dryRun && inBatch > 0) await batch.commit();

  console.log(
    `\nFertig. ${updated} ${dryRun ? "würden migriert" : "migriert"}, ${skipped} bereits aktuell.`
  );
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Fehler beim Backfill:", err);
    process.exit(1);
  });
