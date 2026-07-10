import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { collection, doc, onSnapshot, updateDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "./AuthContext";

const KlasseContext = createContext(null);

export function KlasseProvider({ klasseId, children }) {
  const { profile } = useAuth();
  const [klasse, setKlasse] = useState(null);
  const [kurse, setKurse] = useState([]);
  const [klasseLoading, setKlasseLoading] = useState(true);
  const [kurseLoading, setKurseLoading] = useState(true);

  // Klassen-Doc live beobachten; wird die Klasse gelöscht -> klasseId am User zurücksetzen
  useEffect(() => {
    setKlasseLoading(true);
    const unsub = onSnapshot(
      doc(db, "klassen", klasseId),
      (snap) => {
        if (snap.exists()) {
          setKlasse({ id: snap.id, ...snap.data() });
        } else {
          setKlasse(null);
          updateDoc(doc(db, "users", profile.uid), { klasseId: null }).catch(() => {});
        }
        setKlasseLoading(false);
      },
      () => setKlasseLoading(false)
    );
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [klasseId]);

  // Alle Kurse der Klasse live
  useEffect(() => {
    setKurseLoading(true);
    const unsub = onSnapshot(
      collection(db, "klassen", klasseId, "kurse"),
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        list.sort((a, b) => a.name.localeCompare(b.name, "de"));
        setKurse(list);
        setKurseLoading(false);
      },
      () => setKurseLoading(false)
    );
    return unsub;
  }, [klasseId]);

  const meineKurse = useMemo(
    () => kurse.filter((k) => k.memberIds?.includes(profile.uid)),
    [kurse, profile.uid]
  );

  const isKlassenAdmin = klasse?.adminIds?.includes(profile.uid) || false;

  // Rechte-Helfer: Kurs bearbeiten/löschen darf Klassen-Admin oder Kurs-Ersteller
  const canManageKurs = (kurs) => isKlassenAdmin || kurs?.erstellerId === profile.uid;

  return (
    <KlasseContext.Provider
      value={{
        klasse,
        kurse,
        meineKurse,
        isKlassenAdmin,
        canManageKurs,
        loading: klasseLoading || kurseLoading,
      }}
    >
      {children}
    </KlasseContext.Provider>
  );
}

export function useKlasse() {
  return useContext(KlasseContext);
}
