import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "./firebase";

// Live-Listener auf eine Kurs-Subcollection (materialien, hausaufgaben, pruefungen, chat)
export function useKursCollection(klasseId, kursId, sub) {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!klasseId || !kursId) return;
    setLoading(true);
    const unsub = onSnapshot(
      collection(db, "klassen", klasseId, "kurse", kursId, sub),
      (snap) => {
        setDocs(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      () => setLoading(false)
    );
    return unsub;
  }, [klasseId, kursId, sub]);

  return { docs, loading };
}

export function tsMillis(createdAt) {
  return createdAt?.toMillis?.() ?? (typeof createdAt === "number" ? createdAt : 0);
}
