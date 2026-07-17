import {
  addDoc, arrayRemove, arrayUnion, collection, deleteDoc, deleteField, doc,
  getDoc, getDocs, query, updateDoc, where, writeBatch,
} from "firebase/firestore";
import { deleteObject, listAll, ref as storageRef } from "firebase/storage";
import { db, storage } from "./firebase";

// 5-stelliger Zugangscode; ohne leicht verwechselbare Zeichen (0/O, 1/I).
// Reine Zufallslogik – die Eindeutigkeit wird über generateUniqueCode() sichergestellt.
export function generateCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 5; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

// Würfelt so lange, bis ein Code gefunden ist, den noch keine Klasse belegt.
// Verhindert doppelte Codes (sonst würde joinByCode bei mehreren Treffern
// blind docs[0] nehmen -> Beitritt in die falsche Klasse).
async function generateUniqueCode(maxTries = 8) {
  for (let i = 0; i < maxTries; i++) {
    const code = generateCode();
    const snap = await getDocs(
      query(collection(db, "klassen"), where("code", "==", code))
    );
    if (snap.empty) return code;
  }
  throw new Error("Konnte keinen freien Klassencode erzeugen. Bitte erneut versuchen.");
}

export async function createKlasse(name, uid) {
  const code = await generateUniqueCode();
  const klasseRef = await addDoc(collection(db, "klassen"), {
    name: name.trim(),
    code,
    adminIds: [uid],
    createdAt: Date.now(),
  });
  // Neue Klasse zur Mitgliedschaft hinzufügen und direkt aktiv schalten
  await updateDoc(doc(db, "users", uid), {
    klasseIds: arrayUnion(klasseRef.id),
    activeKlasseId: klasseRef.id,
  });
  return klasseRef.id;
}

export async function joinByCode(code, uid) {
  const snap = await getDocs(
    query(collection(db, "klassen"), where("code", "==", code.trim().toUpperCase()))
  );
  if (snap.empty) throw new Error("Keine Klasse mit diesem Code gefunden.");
  const klasseDoc = snap.docs[0];
  // Gesperrte vor dem Schreiben abfangen – sonst würde der optimistische Write kurz
  // die App rendern. Die Rule sichert es serverseitig zusätzlich ab.
  if ((klasseDoc.data().bannedIds || []).includes(uid)) {
    throw new Error("Du wurdest aus dieser Klasse entfernt und kannst ihr nicht erneut beitreten.");
  }
  const klasseId = klasseDoc.id;
  await updateDoc(doc(db, "users", uid), {
    klasseIds: arrayUnion(klasseId),
    activeKlasseId: klasseId,
  });
  return klasseId;
}

// Zwischen den eigenen Klassen wechseln (aktive Klasse am User-Doc)
export function switchActiveKlasse(uid, klasseId) {
  return updateDoc(doc(db, "users", uid), { activeKlasseId: klasseId });
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
// sich per MembershipsContext-Listener selbst raus (klasseIds: arrayRemove → Onboarding/andere Klasse).
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
// entfernen, Klasse aus der eigenen Mitgliedschaft (klasseIds) entfernen. War es die
// aktive Klasse, fällt activeKlasseId auf eine verbleibende zurück (oder null -> Onboarding).
// isAdmin-Guard: nur Admins dürfen das Klassen-Doc schreiben (Rule), sonst würde die
// adminIds-Zeile mit permission-denied fehlschlagen und den User-Write verhindern.
export async function leaveKlasse(klasseId, uid, kurse = [], isAdmin = false, klasseIds = [], activeKlasseId = null) {
  await Promise.all(
    kurse
      .filter((k) => k.memberIds?.includes(uid))
      .map((k) => setKursMembership(klasseId, k.id, uid, false))
  );
  if (isAdmin) {
    await updateDoc(doc(db, "klassen", klasseId), { adminIds: arrayRemove(uid) });
  }
  const rest = klasseIds.filter((id) => id !== klasseId);
  const nextActive = activeKlasseId === klasseId ? (rest[0] ?? null) : activeKlasseId;
  await updateDoc(doc(db, "users", uid), {
    klasseIds: arrayRemove(klasseId),
    activeKlasseId: nextActive,
  });
}

// ── Schuljahres-Migration ────────────────────────────────────────────────────
// Ein Klassen-Admin schreibt eine Einladung ans QUELL-Klassen-Doc. Alle betroffenen
// Mitglieder sind dort bereits Mitglied und beobachten es via MembershipsProvider;
// sie treten der Zielklasse selbst bei (acceptMigration) und bleiben in der alten.

// Migration starten: schreibt das migration-Feld an die Quellklasse (nur Admin, Rule).
export function startMigration(sourceKlasseId, target, memberIds = []) {
  return updateDoc(doc(db, "klassen", sourceKlasseId), {
    migration: {
      id: `${sourceKlasseId}_${Date.now()}`,
      targetId: target.id,
      targetName: target.name,
      memberIds,
      createdAt: Date.now(),
    },
  });
}

// Laufende Migration beenden/zurückziehen (Admin räumt die Einladung ab).
export function endMigration(sourceKlasseId) {
  return updateDoc(doc(db, "klassen", sourceKlasseId), { migration: deleteField() });
}

// Einladung annehmen: der Zielklasse beitreten (bleibt in der alten Klasse), aktiv schalten
// und die Migration als behandelt markieren. Ban-Pre-Check wie bei joinByCode.
export async function acceptMigration(uid, migration) {
  const targetSnap = await getDoc(doc(db, "klassen", migration.targetId));
  if (!targetSnap.exists()) {
    // Ziel existiert nicht mehr -> Einladung stillschweigend als erledigt markieren
    await dismissMigration(uid, migration.id);
    throw new Error("Die Zielklasse existiert nicht mehr.");
  }
  if ((targetSnap.data().bannedIds || []).includes(uid)) {
    throw new Error("Du wurdest aus der Zielklasse entfernt und kannst ihr nicht beitreten.");
  }
  await updateDoc(doc(db, "users", uid), {
    klasseIds: arrayUnion(migration.targetId),
    activeKlasseId: migration.targetId,
    migrationsSeen: arrayUnion(migration.id),
  });
}

// Einladung ablehnen/später: nur als behandelt markieren (Banner verschwindet).
export function dismissMigration(uid, migrationId) {
  return updateDoc(doc(db, "users", uid), { migrationsSeen: arrayUnion(migrationId) });
}

// Wirft mit Kontext, welche Kaskadenstufe fehlschlug (macht permission-denied lokalisierbar)
function stepError(step, e) {
  const code = e?.code || e?.message || String(e);
  return new Error(`${step} (${code})`);
}

async function deleteSubcollection(pathSegments) {
  const path = pathSegments.join("/");
  let snap;
  try {
    snap = await getDocs(collection(db, ...pathSegments));
  } catch (e) {
    throw stepError(`Lesen von ${path}`, e);
  }
  const docs = snap.docs;
  for (let i = 0; i < docs.length; i += 450) {
    const batch = writeBatch(db);
    docs.slice(i, i + 450).forEach((d) => batch.delete(d.ref));
    try {
      await batch.commit();
    } catch (e) {
      throw stepError(`Löschen in ${path} (${docs.length} Docs)`, e);
    }
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
  try {
    await deleteDoc(doc(db, "klassen", klasseId, "kurse", kursId));
  } catch (e) {
    throw stepError(`Löschen Kurs-Doc ${kursId}`, e);
  }
}

// Klasse löschen: alle Kurse (inkl. Dateien) kaskadierend, dann das Klassen-Doc.
// Mitglieder werden über den Klassen-Listener automatisch ins Onboarding geworfen.
export async function deleteKlasse(klasseId) {
  let kurseSnap;
  try {
    kurseSnap = await getDocs(collection(db, "klassen", klasseId, "kurse"));
  } catch (e) {
    throw stepError("Lesen der Kursliste", e);
  }
  for (const kurs of kurseSnap.docs) {
    await deleteKurs(klasseId, kurs.id);
  }
  // Sammlungen (Klassenebene) aufräumen – vor dem Klassen-Doc (Rules lesen es per get())
  await deleteSubcollection(["klassen", klasseId, "sammlungen"]);
  try {
    await deleteDoc(doc(db, "klassen", klasseId));
  } catch (e) {
    throw stepError("Löschen Klassen-Doc", e);
  }
}
