import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "./AuthContext";
import { useKlasse } from "./KlasseContext";
import {
  ARCHIV_AB_TAGEN, bezugsZeit, istGelesen, sichtbarFuer, terminTage,
} from "../lib/ankuendigungActions";

// Ankündigungen der aktiven Klasse, bereits auf die eigene Zielgruppe gefiltert.
// Ein einziger Listener auf die Klassen-Subcollection – anders als bei Materialien
// (ein Listener je Kurs), weil Ankündigungen an der Klasse hängen.
//
// Kein Aufräumen abgelaufener Ankündigungen im Client: das macht der tägliche
// Vercel-Cron (api/purge-ankuendigungen.js). Ein Client-Purge liefe in den Ferien nie.
const AnkuendigungenContext = createContext(null);

const TAG_MS = 24 * 60 * 60 * 1000;

export function AnkuendigungenProvider({ children }) {
  const { profile } = useAuth();
  const { klasse, meineKurse } = useKlasse();
  const [alleRoh, setAlleRoh] = useState([]);

  useEffect(() => {
    setAlleRoh([]);
    if (!klasse) return;
    return onSnapshot(
      collection(db, "klassen", klasse.id, "ankuendigungen"),
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        setAlleRoh(list);
      },
      () => setAlleRoh([])
    );
  }, [klasse?.id]);

  const meineKursIds = useMemo(() => meineKurse.map((k) => k.id), [meineKurse]);
  const meineKursIdsKey = meineKursIds.join(",");

  const alle = useMemo(
    () => alleRoh.filter((a) => sichtbarFuer(a, meineKursIds)),
    // meineKursIdsKey hält das Memo stabil, wenn sich nur die Kurs-Objekte neu bilden
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [alleRoh, meineKursIdsKey]
  );

  const ungelesene = useMemo(
    () => alle.filter((a) => !istGelesen(a, profile.uid)),
    [alle, profile.uid]
  );

  // Archiv-Grenze zählt ab bezugsZeit (Erstellung ODER Terminende, je nachdem was später
  // liegt) – eine Ankündigung mit noch bevorstehendem Termin bleibt so unter „Aktuell".
  const { aktuelle, archiv } = useMemo(() => {
    const grenze = Date.now() - ARCHIV_AB_TAGEN * TAG_MS;
    return {
      aktuelle: alle.filter((a) => bezugsZeit(a) >= grenze),
      archiv: alle.filter((a) => bezugsZeit(a) < grenze),
    };
  }, [alle]);

  // { "YYYY-MM-DD": [{ id, titel, termin }] } für den Kalender
  const termineByISO = useMemo(() => {
    const map = {};
    for (const ank of alle) {
      if (!ank.termin) continue;
      for (const iso of terminTage(ank.termin)) {
        (map[iso] ||= []).push({
          id: ank.id,
          titel: ank.termin.titel || ank.titel,
          zeit: ank.termin.zeit || null,
        });
      }
    }
    return map;
  }, [alle]);

  return (
    <AnkuendigungenContext.Provider
      value={{ alle, ungelesene, aktuelle, archiv, termineByISO }}
    >
      {children}
    </AnkuendigungenContext.Provider>
  );
}

export function useAnkuendigungen() {
  return useContext(AnkuendigungenContext);
}
