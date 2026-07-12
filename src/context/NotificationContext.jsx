import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "./AuthContext";
import { useKlasse } from "./KlasseContext";

// Neue Materialien seit dem letzten "Alle gelesen"-Klick, live pro beigetretenem Kurs.
// lastSeen wird pro User in localStorage gehalten und NUR über markAllRead() aktualisiert.
const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { profile } = useAuth();
  const { klasse, meineKurse } = useKlasse();
  const [items, setItems] = useState([]);
  const seenIds = useRef(new Set());

  const lastSeenKey = `classsync_lastSeen_${profile.uid}`;
  const kursIdsKey = meineKurse.map((k) => k.id).join(",");

  useEffect(() => {
    seenIds.current = new Set();
    setItems([]);
    if (!klasse) return;

    const lastSeen = Number(localStorage.getItem(lastSeenKey) || 0);
    const unsubs = meineKurse.map((kurs) =>
      onSnapshot(
        collection(db, "klassen", klasse.id, "kurse", kurs.id, "materialien"),
        (snap) => {
          const neu = [];
          snap.docChanges().forEach((change) => {
            if (change.type !== "added") return;
            const data = change.doc.data();
            const id = change.doc.id;
            if (seenIds.current.has(id)) return;
            seenIds.current.add(id);
            const ts = data.createdAt?.toMillis?.() ?? Date.now();
            if (ts <= lastSeen) return; // älter als letzter Besuch
            if (data.autorId === profile.uid) return; // eigene Uploads nicht melden
            neu.push({
              id,
              kursId: kurs.id,
              kursName: kurs.name,
              farbe: kurs.farbe,
              typ: data.typ,
              titel: data.titel,
              autor: data.autor,
              createdAt: ts,
            });
          });
          if (neu.length) {
            setItems((prev) =>
              [...prev, ...neu].sort((a, b) => b.createdAt - a.createdAt)
            );
          }
        }
      )
    );
    return () => unsubs.forEach((u) => u());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [klasse?.id, kursIdsKey]);

  function markAllRead() {
    localStorage.setItem(lastSeenKey, String(Date.now()));
    setItems([]);
  }

  const grouped = useMemo(() => {
    const byKurs = new Map();
    for (const item of items) {
      if (!byKurs.has(item.kursId)) {
        byKurs.set(item.kursId, {
          kursId: item.kursId, kursName: item.kursName,
          farbe: item.farbe, items: [],
        });
      }
      byKurs.get(item.kursId).items.push(item);
    }
    return [...byKurs.values()];
  }, [items]);

  return (
    <NotificationContext.Provider value={{ items, grouped, unreadCount: items.length, markAllRead }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationContext);
}
