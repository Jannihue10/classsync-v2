import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "./firebase";
import { useKlasse } from "../context/KlasseContext";

// Live-Listener auf eine Subcollection über ALLE eigenen Kurse hinweg
// (für Übersicht und Kalender: Hausaufgaben/Prüfungen aller beigetretenen Kurse)
export function useAcrossKurse(sub) {
  const { klasse, meineKurse } = useKlasse();
  const [byKurs, setByKurs] = useState({});
  const kursIdsKey = meineKurse.map((k) => k.id).join(",");

  useEffect(() => {
    setByKurs({});
    if (!klasse) return;
    const unsubs = meineKurse.map((kurs) =>
      onSnapshot(collection(db, "klassen", klasse.id, "kurse", kurs.id, sub), (snap) => {
        setByKurs((prev) => ({
          ...prev,
          [kurs.id]: snap.docs.map((d) => ({ id: d.id, ...d.data(), kursId: kurs.id })),
        }));
      })
    );
    return () => unsubs.forEach((u) => u());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [klasse?.id, kursIdsKey, sub]);

  // Flache Liste, jedes Doc um den zugehörigen Kurs ergänzt
  return useMemo(() => {
    const kursById = Object.fromEntries(meineKurse.map((k) => [k.id, k]));
    return Object.values(byKurs)
      .flat()
      .filter((d) => kursById[d.kursId])
      .map((d) => ({ ...d, kurs: kursById[d.kursId] }));
  }, [byKurs, meineKurse]);
}
