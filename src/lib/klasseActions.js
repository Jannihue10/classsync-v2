import {
  addDoc, arrayRemove, arrayUnion, collection, deleteDoc, doc,
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
  const klasseId = snap.docs[0].id;
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
