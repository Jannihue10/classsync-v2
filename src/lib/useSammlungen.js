import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "./firebase";
import { useAuth } from "../context/AuthContext";
import { useKlasse } from "../context/KlasseContext";

// Live-Listener auf alle Sammlungen, in denen ich Mitglied bin.
// Rückgabe getrennt nach meine (owner) und geteilt (Kollaborator).
export function useSammlungen() {
  const { profile } = useAuth();
  const { klasse } = useKlasse();
  const [alle, setAlle] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!klasse) return;
    setLoading(true);
    const q = query(
      collection(db, "klassen", klasse.id, "sammlungen"),
      where("memberIds", "array-contains", profile.uid)
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        setAlle(list);
        setLoading(false);
      },
      () => setLoading(false)
    );
    return unsub;
  }, [klasse?.id, profile.uid]);

  const { meine, geteilt } = useMemo(() => {
    const meine = alle.filter((s) => s.ownerId === profile.uid);
    const geteilt = alle.filter((s) => s.ownerId !== profile.uid);
    return { meine, geteilt };
  }, [alle, profile.uid]);

  return { alle, meine, geteilt, loading };
}
