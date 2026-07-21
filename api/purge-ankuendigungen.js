// Vercel-Cron: löscht abgelaufene Ankündigungen (expiresAt < jetzt) samt Anhang.
//
// Warum serverseitig und nicht im Client: ein Lazy-Purge beim App-Start würde nur laufen,
// solange sich ein Klassen-Admin einloggt – in den Ferien also nie. Warum Vercel-Cron und
// nicht eine Firebase Cloud Function: das Repo hat kein firebase.json/functions-Setup und
// keinen Firebase-CLI-Deploy, aber mit api/auth-email.js bereits einen Admin-SDK-Endpoint
// samt Env-Vars, der bei jedem git push mitdeployt.
//
// Env-Vars (Vercel, unpräfixiert – NICHT VITE_):
//   CRON_SECRET, FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
//   optional FIREBASE_STORAGE_BUCKET
//
// Der Aufruf braucht `Authorization: Bearer $CRON_SECRET` – Vercel setzt den Header bei
// Cron-Aufrufen automatisch. Ohne Schutz könnte jeder den Löschlauf auslösen.
//
// ⚠️ Bewusst KEINE collectionGroup-Query, sondern eine Subcollection-Query je Klasse:
// Firestore legt Einzelfeld-Indizes nur mit *Collection*-Scope automatisch an. Eine
// collectionGroup-Query auf `expiresAt` bräuchte eine manuell angelegte Einzelfeld-
// Ausnahme mit Collection-Group-Scope – und der Anlege-Link aus der Fehlermeldung führt
// auf die Seite für ZUSAMMENGESETZTE Indizes, die mindestens zwei Felder verlangt und
// deshalb mit "unbekannter Fehler" abbricht. Ein Setup-Schritt weniger ist hier mehr
// wert als die eine gesparte Query. (Bei vielen tausend Klassen neu bewerten.)

import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

const BUCKET = process.env.FIREBASE_STORAGE_BUCKET || "classsync-v2.firebasestorage.app";
const BATCH_SIZE = 450;

function admin() {
  if (!getApps().length) {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
      }),
      storageBucket: BUCKET,
    });
  }
  return { db: getFirestore(), bucket: getStorage().bucket(BUCKET) };
}

// Kernlogik getrennt vom HTTP-Handler, damit scripts/test-purge.mjs sie ohne Deploy
// aufrufen kann.
export async function purgeAbgelaufene({ dryRun = false } = {}) {
  const { db, bucket } = admin();
  const jetzt = Date.now();

  // Eine Query je Klasse; die Subcollections sind klein und liefern meist 0 Treffer.
  const klassen = await db.collection("klassen").get();
  const abgelaufen = [];
  for (const klasse of klassen.docs) {
    const snap = await klasse.ref
      .collection("ankuendigungen")
      .where("expiresAt", "<", jetzt)
      .get();
    abgelaufen.push(...snap.docs);
  }

  if (abgelaufen.length === 0) {
    return { klassen: klassen.size, gefunden: 0, geloescht: 0, dateien: 0 };
  }
  if (dryRun) {
    return { klassen: klassen.size, gefunden: abgelaufen.length, geloescht: 0, dateien: 0 };
  }

  // Erst die Storage-Dateien (danach ist der storagePath aus dem Doc weg)
  let dateien = 0;
  for (const doc of abgelaufen) {
    const pfad = doc.get("storagePath");
    if (!pfad) continue;
    try {
      await bucket.file(pfad).delete();
      dateien++;
    } catch (e) {
      // 404 = Datei schon weg; alles andere protokollieren, aber den Lauf nicht abbrechen
      if (e?.code !== 404) console.error("purge: Datei", pfad, e?.message || e);
    }
  }

  let geloescht = 0;
  for (let i = 0; i < abgelaufen.length; i += BATCH_SIZE) {
    const batch = db.batch();
    const teil = abgelaufen.slice(i, i + BATCH_SIZE);
    teil.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    geloescht += teil.length;
  }

  return { klassen: klassen.size, gefunden: abgelaufen.length, geloescht, dateien };
}

export default async function handler(req, res) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return res.status(500).json({ error: "server-not-configured" });

  const auth = req.headers.authorization || "";
  if (auth !== `Bearer ${secret}`) {
    return res.status(401).json({ error: "unauthorized" });
  }

  try {
    const ergebnis = await purgeAbgelaufene();
    console.log("purge-ankuendigungen", ergebnis);
    return res.status(200).json({ ok: true, ...ergebnis });
  } catch (e) {
    console.error("purge-ankuendigungen fatal", e);
    return res.status(500).json({ error: "internal", message: e?.message });
  }
}
