import { arrayRemove, arrayUnion, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { deleteObject, ref as storageRef } from "firebase/storage";
import { db, storage } from "../../lib/firebase";

export function toggleLike(klasseId, kursId, mat, uid) {
  const liked = mat.likes?.includes(uid);
  return updateDoc(doc(db, "klassen", klasseId, "kurse", kursId, "materialien", mat.id), {
    likes: liked ? arrayRemove(uid) : arrayUnion(uid),
  });
}

// Erst Storage-Datei (über storagePath), dann Firestore-Doc löschen
export async function deleteMaterial(klasseId, kursId, mat) {
  if (mat.storagePath) {
    await deleteObject(storageRef(storage, mat.storagePath)).catch(() => {});
  }
  await deleteDoc(doc(db, "klassen", klasseId, "kurse", kursId, "materialien", mat.id));
}

// Löschen dürfen: Autor, Klassen-Admin und Kurs-Admin (= Kurs-Ersteller)
export function canDeleteMaterial(mat, uid, isKlassenAdmin, kurs) {
  return isKlassenAdmin || kurs?.erstellerId === uid || mat.autorId === uid;
}
