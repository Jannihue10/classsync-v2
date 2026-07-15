import { deleteDoc, doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";

function msgRef(klasseId, kursId, msgId) {
  return doc(db, "klassen", klasseId, "kurse", kursId, "chat", msgId);
}

// Eigenen Text bearbeiten; editedAt markiert die Nachricht als „bearbeitet"
export function editMessage(klasseId, kursId, msgId, text) {
  return updateDoc(msgRef(klasseId, kursId, msgId), {
    text,
    editedAt: serverTimestamp(),
  });
}

// Löschen als Tombstone: Nachricht bleibt als Platzhalter stehen, Text wird geleert
export function deleteMessage(klasseId, kursId, msgId) {
  return updateDoc(msgRef(klasseId, kursId, msgId), {
    deleted: true,
    text: "",
  });
}

// Hard-Delete nur für die Lösch-Kaskade (Kurs/Klasse löschen) – nicht in der Chat-UI
export function purgeMessage(klasseId, kursId, msgId) {
  return deleteDoc(msgRef(klasseId, kursId, msgId));
}

// Bearbeiten darf nur der Autor (und nicht auf gelöschten Nachrichten)
export function canEditMessage(msg, uid) {
  return !msg.deleted && msg.autorId === uid;
}

// Löschen dürfen: Autor, Kurs-Admin und Klassen-Admin (canModerate)
export function canDeleteMessage(msg, uid, canModerate) {
  return !msg.deleted && (msg.autorId === uid || canModerate);
}
