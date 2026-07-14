import {
  addDoc, arrayRemove, arrayUnion, collection, deleteDoc, deleteField, doc,
  getDocs, query, updateDoc, where, writeBatch,
} from "firebase/firestore";
import { deleteObject, listAll, ref as storageRef } from "firebase/storage";
import { db, storage } from "./firebase";

// 5-stelliger Zugangscode; ohne leicht verwechselbare Zeichen (0/O, 1/I)
export function generateCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 5; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export async function createKlasse(name, uid) {
  const klasseRef = await addDoc(collection(db, "klassen"), {
    name: name.trim(),
    code: generateCode(),
    adminIds: [uid],
    createdAt: Date.now(),
  });
  await updateDoc(doc(db, "users", uid), { klasseId: klasseRef.id });
  return klasseRef.id;
}

export async function joinByCode(code, uid) {
  const snap = await getDocs(
    query(collection(db, "klassen"), where("code", "==", code.trim().toUpperCase()))
  );
  if (snap.empty) throw new Error("Keine Klasse mit diesem Code gefunden.");
  const klasseDoc = snap.docs[0];
  // Gesperrte vor dem Schreiben abfangen – sonst würde der optimistische Write kurz
  // die App rendern und das Onboarding (samt Fehler-State) unmounten. Die Rule sichert
  // es serverseitig zusätzlich ab.
  if ((klasseDoc.data().bannedIds || []).includes(uid)) {
    throw new Error("Du wurdest aus dieser Klasse entfernt und kannst ihr nicht erneut beitreten.");
  }
  const klasseId = klasseDoc.id;
  await updateDoc(doc(db, "users", uid), { klasseId });
  return klasseId;
}

export function promoteAdmin(klasseId, uid) {
  return updateDoc(doc(db, "klassen", klasseId), { adminIds: arrayUnion(uid) });
}

export function demoteAdmin(klasseId, uid) {
  return updateDoc(doc(db, "klassen", klasseId), { adminIds: arrayRemove(uid) });
}

// Kurs beitreten / verlassen (memberIds am Kurs-Doc)
export function setKursMembership(klasseId, kursId, uid, join) {
  return updateDoc(doc(db, "klassen", klasseId, "kurse", kursId), {
    memberIds: join ? arrayUnion(uid) : arrayRemove(uid),
  });
}

// Mitglied aus der Klasse sperren (Ban): uid in bannedIds, aus adminIds + allen Kursen
// entfernen, Nickname für die Entsperren-Liste festhalten. Der betroffene Client wirft
// sich per KlasseContext-Listener selbst raus (klasseId: null → Onboarding).
export async function banFromKlasse(klasseId, user, kurse = []) {
  const { uid, nickname } = user;
  await Promise.all(
    kurse
      .filter((k) => k.memberIds?.includes(uid))
      .map((k) => setKursMembership(klasseId, k.id, uid, false))
  );
  await updateDoc(doc(db, "klassen", klasseId), {
    bannedIds: arrayUnion(uid),
    adminIds: arrayRemove(uid),
    [`bannedInfo.${uid}`]: nickname || "Unbekannt",
  });
}

// Sperre aufheben: uid aus bannedIds und den gespeicherten Nickname entfernen.
export function unbanFromKlasse(klasseId, uid) {
  return updateDoc(doc(db, "klassen", klasseId), {
    bannedIds: arrayRemove(uid),
    [`bannedInfo.${uid}`]: deleteField(),
  });
}

// Klasse selbst verlassen: aus allen eigenen Kursen austreten, ggf. aus adminIds
// entfernen, eigene klasseId nullen (landet im Onboarding).
// isAdmin-Guard: nur Admins dürfen das Klassen-Doc schreiben (Rule), sonst würde die
// adminIds-Zeile mit permission-denied fehlschlagen und das klasseId-Nullen verhindern.
export async function leaveKlasse(klasseId, uid, kurse = [], isAdmin = false) {
  await Promise.all(
    kurse
      .filter((k) => k.memberIds?.includes(uid))
      .map((k) => setKursMembership(klasseId, k.id, uid, false))
  );
  if (isAdmin) {
    await updateDoc(doc(db, "klassen", klasseId), { adminIds: arrayRemove(uid) });
  }
  await updateDoc(doc(db, "users", uid), { klasseId: null });
}

async function deleteSubcollection(pathSegments) {
  const snap = await getDocs(collection(db, ...pathSegments));
  const docs = snap.docs;
  for (let i = 0; i < docs.length; i += 450) {
    const batch = writeBatch(db);
    docs.slice(i, i + 450).forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
}

// Kurs löschen inkl. Subcollections + Storage-Dateien
export async function deleteKurs(klasseId, kursId) {
  try {
    const folder = storageRef(storage, `klassen/${klasseId}/kurse/${kursId}`);
    const files = await listAll(folder);
    await Promise.all(files.items.map((f) => deleteObject(f).catch(() => {})));
  } catch {
    // Storage-Ordner existiert evtl. nicht – ignorieren
  }
  for (const sub of ["materialien", "hausaufgaben", "pruefungen", "chat"]) {
    await deleteSubcollection(["klassen", klasseId, "kurse", kursId, sub]);
  }
  await deleteDoc(doc(db, "klassen", klasseId, "kurse", kursId));
}

// Klasse löschen: alle Kurse (inkl. Dateien) kaskadierend, dann das Klassen-Doc.
// Mitglieder werden über den Klassen-Listener automatisch ins Onboarding geworfen.
export async function deleteKlasse(klasseId) {
  const kurseSnap = await getDocs(collection(db, "klassen", klasseId, "kurse"));
  for (const kurs of kurseSnap.docs) {
    await deleteKurs(klasseId, kurs.id);
  }
  // Sammlungen (Klassenebene) aufräumen – vor dem Klassen-Doc (Rules lesen es per get())
  await deleteSubcollection(["klassen", klasseId, "sammlungen"]);
  await deleteDoc(doc(db, "klassen", klasseId));
}
