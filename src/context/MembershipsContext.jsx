import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { arrayRemove, doc, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "./AuthContext";

// Beobachtet ALLE Klassen, in denen der User Mitglied ist (nicht nur die aktive).
// Liefert die Liste für den Klassen-Wechsler, erkennt Schuljahres-Migrations-Einladungen
// und wirft den User bei Ban/Löschung klassenübergreifend selbst raus (arrayRemove).
const MembershipsContext = createContext(null);

export function MembershipsProvider({ children }) {
  const { profile, updateProfile } = useAuth();
  const uid = profile.uid;
  const klasseIds = useMemo(() => profile.klasseIds || [], [profile.klasseIds]);
  const activeKlasseId = profile.activeKlasseId || null;
  const migrationsSeen = useMemo(() => profile.migrationsSeen || [], [profile.migrationsSeen]);

  const [classMap, setClassMap] = useState({}); // id -> Klassen-Doc (nur existierende)
  const evictingRef = useRef(new Set());
  const idsKey = klasseIds.join(",");

  useEffect(() => {
    evictingRef.current = new Set();
    if (klasseIds.length === 0) {
      setClassMap({});
      return;
    }

    // Klasse aus der eigenen Mitgliedschaft entfernen (gelöscht ODER dort gesperrt).
    // Nur das eigene User-Doc wird geschrieben (Rule erlaubt Entfernen).
    const evict = (id) => {
      if (evictingRef.current.has(id)) return;
      evictingRef.current.add(id);
      const rest = klasseIds.filter((x) => x !== id);
      updateProfile({
        klasseIds: arrayRemove(id),
        activeKlasseId: activeKlasseId === id ? (rest[0] ?? null) : activeKlasseId,
      }).catch(() => {});
    };

    const unsubs = klasseIds.map((id) =>
      onSnapshot(
        doc(db, "klassen", id),
        (snap) => {
          if (!snap.exists()) {
            setClassMap((prev) => {
              if (!prev[id]) return prev;
              const next = { ...prev };
              delete next[id];
              return next;
            });
            evict(id); // Klasse gelöscht -> raus
            return;
          }
          const data = snap.data();
          if ((data.bannedIds || []).includes(uid)) {
            setClassMap((prev) => {
              if (!prev[id]) return prev;
              const next = { ...prev };
              delete next[id];
              return next;
            });
            evict(id); // gesperrt -> raus
            return;
          }
          setClassMap((prev) => ({ ...prev, [id]: { id, ...data } }));
        },
        () => {}
      )
    );
    return () => unsubs.forEach((u) => u());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey]);

  const myClasses = useMemo(
    () => Object.values(classMap).sort((a, b) => a.name.localeCompare(b.name, "de")),
    [classMap]
  );

  // Offene Migrations-Einladungen: Klasse hat eine Migration, ich bin betroffen und bin der
  // Zielklasse noch nicht beigetreten. openMigrations ignoriert migrationsSeen (fürs Profil,
  // dort jederzeit annehmbar); pendingMigrations blendet bereits mit „Später" ausgeblendete
  // aus (fürs Banner).
  const openMigrations = useMemo(
    () =>
      myClasses
        .filter(
          (c) =>
            c.migration &&
            (c.migration.memberIds || []).includes(uid) &&
            !klasseIds.includes(c.migration.targetId)
        )
        .map((c) => ({ sourceId: c.id, sourceName: c.name, migration: c.migration })),
    [myClasses, uid, klasseIds]
  );

  const pendingMigrations = useMemo(
    () => openMigrations.filter((p) => !migrationsSeen.includes(p.migration.id)),
    [openMigrations, migrationsSeen]
  );

  return (
    <MembershipsContext.Provider value={{ myClasses, openMigrations, pendingMigrations }}>
      {children}
    </MembershipsContext.Provider>
  );
}

export function useMemberships() {
  return useContext(MembershipsContext);
}
