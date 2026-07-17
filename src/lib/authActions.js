import {
  EmailAuthProvider,
  reauthenticateWithCredential,
} from "firebase/auth";
import { arrayRemove, collection, deleteDoc, doc, getDocs, updateDoc } from "firebase/firestore";
import { db } from "./firebase";
import { setKursMembership } from "./klasseActions";

// Account löschen (clientseitig, Umfang: Mitgliedschaft + Profil).
// Ablauf – Reihenfolge ist wichtig, weil der Client nach `user.delete()` keine
// Firestore-Rechte mehr hat: erst aufräumen, dann Auth-Nutzer entfernen.
//   1. Reauthentifizierung mit dem aktuellen Passwort (Firebase verlangt kürzlichen Login).
//   2. Letzter-Admin-Guard: ist der Nutzer alleiniger Admin einer Klasse -> Abbruch mit Meldung
//      (analog "Klasse verlassen"; er muss erst die Rolle übertragen oder die Klasse löschen).
//   3. Pro Klasse in klasseIds: aus allen Kursen austreten, ggf. aus adminIds entfernen.
//   4. Eigenes users-Doc löschen (Rule: users delete nur für sich selbst).
//   5. Firebase-Auth-Nutzer löschen -> Session fällt weg, Auth-Gate landet auf Login.
//
// Geteilte Inhalte (Materialien, HAs, Prüfungen, Chat, Sammlungen) bleiben bewusst mit
// dem denormalisierten Nickname in den Klassen erhalten. Für einen späteren DSGVO-Voll-Wipe
// ist unten die Naht markiert (siehe TODO); das Chat-Harddelete braucht dann den Admin-SDK-Endpoint.
export async function deleteAccount({ user, profile, myClasses = [], currentPassword }) {
  const uid = user.uid;

  // 1. Reauthentifizierung
  const cred = EmailAuthProvider.credential(user.email, currentPassword);
  await reauthenticateWithCredential(user, cred);

  // 2. Letzter-Admin-Guard über die bereits beobachteten eigenen Klassen (myClasses).
  const soleAdminOf = myClasses.filter(
    (c) => Array.isArray(c.adminIds) && c.adminIds.length === 1 && c.adminIds[0] === uid
  );
  if (soleAdminOf.length > 0) {
    const namen = soleAdminOf.map((c) => `„${c.name}"`).join(", ");
    const err = new Error(
      `Du bist letzter Admin von ${namen}. Übertrage zuerst die Admin-Rolle oder lösche die Klasse${
        soleAdminOf.length > 1 ? "n" : ""
      }.`
    );
    err.code = "account/last-admin";
    throw err;
  }

  // 3. Mitgliedschafts-Cleanup pro Klasse
  const klasseIds = profile.klasseIds || [];
  for (const klasseId of klasseIds) {
    let kurseSnap;
    try {
      kurseSnap = await getDocs(collection(db, "klassen", klasseId, "kurse"));
    } catch {
      // Klasse evtl. schon gelöscht -> nichts aufzuräumen
      continue;
    }
    await Promise.all(
      kurseSnap.docs
        .filter((k) => (k.data().memberIds || []).includes(uid))
        .map((k) => setKursMembership(klasseId, k.id, uid, false))
    );
    // Nicht-letzter Admin: aus adminIds entfernen (letzter Admin wurde oben ausgeschlossen)
    const meine = myClasses.find((c) => c.id === klasseId);
    if (meine && (meine.adminIds || []).includes(uid)) {
      await updateDoc(doc(db, "klassen", klasseId), { adminIds: arrayRemove(uid) });
    }

    // TODO (DSGVO-Voll-Wipe): hier die eigenen Inhalte dieser Klasse purgen –
    // Materialien (+Storage-Dateien), Hausaufgaben, Prüfungen, eigene Sammlungen; Chat hart
    // löschen. Chat-Harddelete für Autoren ist clientseitig nicht erlaubt -> dafür einen
    // Admin-SDK-Endpoint (api/delete-account.js) ergänzen und diesen Schritt dorthin verlagern.
  }

  // 4. Eigenes User-Doc löschen
  await deleteDoc(doc(db, "users", uid));

  // 5. Auth-Nutzer löschen (zuletzt)
  await user.delete();
}
