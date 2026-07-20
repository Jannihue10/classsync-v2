import { addDoc, collection, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { db } from "./firebase";

// Sammlungen liegen auf Klassenebene (analog zu kurse) und nutzen das bewährte
// memberIds-Muster: [ownerId] = privat; weitere Mitglieder = geteilt/kollaborativ.
// items sind Referenzen { kursId, matId } + denormalisierte Fallback-Labels { titel, typ }.
// pruefung ist optional: dieselbe Referenz-Mechanik für „wofür ist das gedacht".

const sammlungRef = (klasseId, sammlungId) =>
  doc(db, "klassen", klasseId, "sammlungen", sammlungId);

export function createSammlung(klasseId, { name, ownerId, ownerNick, pruefung }) {
  return addDoc(collection(db, "klassen", klasseId, "sammlungen"), {
    name: name.trim(),
    ownerId,
    ownerNick,
    memberIds: [ownerId],
    items: [],
    pruefung: pruefung || null,
    createdAt: Date.now(),
  });
}

export function renameSammlung(klasseId, sammlungId, name) {
  return updateDoc(sammlungRef(klasseId, sammlungId), { name: name.trim() });
}

export function deleteSammlung(klasseId, sammlungId) {
  return deleteDoc(sammlungRef(klasseId, sammlungId));
}

// Baut ein schlankes Item aus einem (angereicherten) Material – mat.kurs ist gesetzt
// (useAcrossKurse). Fällt notfalls auf mat.kursId zurück.
export function itemFromMaterial(mat) {
  return {
    kursId: mat.kurs?.id || mat.kursId,
    matId: mat.id,
    titel: mat.titel || "",
    typ: mat.typ || "",
  };
}

// Gegenstück zu itemFromMaterial für die verknüpfte Prüfung. titel/datum sind
// denormalisiert, damit die Anzeige hält, wenn die Prüfung gelöscht wird oder man
// den Kurs verlassen hat (analog zu „Material nicht mehr verfügbar").
export function pruefungRefFrom(pr) {
  if (!pr) return null;
  return {
    kursId: pr.kurs?.id || pr.kursId,
    prId: pr.id,
    titel: pr.titel || "",
    datum: pr.datum || "",
  };
}

// Nur der Owner darf das Feld setzen – die Firestore-Rule lässt Nicht-Owner
// ausschließlich an items/memberIds (s. firestore.rules, Sammlungen-update).
export function setSammlungPruefung(klasseId, sammlungId, pruefung) {
  return updateDoc(sammlungRef(klasseId, sammlungId), { pruefung: pruefung || null });
}

export function isInSammlung(sammlung, matId) {
  return (sammlung.items || []).some((it) => it.matId === matId);
}

// Read-Modify-Write auf dem live geladenen Sammlung-Doc (Array ist klein).
export function addItem(klasseId, sammlung, item) {
  if (isInSammlung(sammlung, item.matId)) return Promise.resolve();
  const items = [...(sammlung.items || []), item];
  return updateDoc(sammlungRef(klasseId, sammlung.id), { items });
}

export function removeItem(klasseId, sammlung, matId) {
  const items = (sammlung.items || []).filter((it) => it.matId !== matId);
  return updateDoc(sammlungRef(klasseId, sammlung.id), { items });
}

export function setSammlungMembers(klasseId, sammlungId, memberIds) {
  return updateDoc(sammlungRef(klasseId, sammlungId), { memberIds });
}

// Kollaborator verlässt eine geteilte Sammlung (entfernt sich aus memberIds)
export function leaveSammlung(klasseId, sammlung, uid) {
  const memberIds = (sammlung.memberIds || []).filter((id) => id !== uid);
  return updateDoc(sammlungRef(klasseId, sammlung.id), { memberIds });
}
