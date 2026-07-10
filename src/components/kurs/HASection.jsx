import { useMemo, useState } from "react";
import { addDoc, arrayRemove, arrayUnion, collection, deleteDoc, doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useAuth } from "../../context/AuthContext";
import { useKlasse } from "../../context/KlasseContext";
import { useTheme } from "../../context/ThemeContext";
import { calcTage, formatDatum, todayISO } from "../../lib/dates";
import { radius } from "../../styles/theme";
import { Btn, Card, Empty, SectionTitle } from "../ui/UI";
import HADetailModal from "./HADetailModal";

export function haRef(klasseId, kursId, haId) {
  return doc(db, "klassen", klasseId, "kurse", kursId, "hausaufgaben", haId);
}

// Abhaken pro User
export function toggleDone(klasseId, kursId, ha, uid) {
  const done = ha.doneBy?.includes(uid);
  return updateDoc(haRef(klasseId, kursId, ha.id), {
    doneBy: done ? arrayRemove(uid) : arrayUnion(uid),
  });
}

// "Für mich löschen" + Auto-Cleanup, wenn alle Kursmitglieder die HA versteckt haben
// (das physische Löschen dürfen laut Rules nur Autor/Klassen-Admin – sonst bleibt das Doc versteckt liegen)
export async function hideForMe(klasseId, kurs, ha, uid, isKlassenAdmin) {
  await updateDoc(haRef(klasseId, kurs.id, ha.id), { hiddenBy: arrayUnion(uid) });
  const hidden = new Set([...(ha.hiddenBy || []), uid]);
  const alleVersteckt = (kurs.memberIds || []).every((m) => hidden.has(m));
  if (alleVersteckt && (ha.autorId === uid || isKlassenAdmin)) {
    await deleteDoc(haRef(klasseId, kurs.id, ha.id)).catch(() => {});
  }
}

export default function HASection({ klasseId, kurs, hausaufgaben, compact }) {
  const { t } = useTheme();
  const { profile } = useAuth();
  const [text, setText] = useState("");
  const [faellig, setFaellig] = useState(todayISO());
  const [busy, setBusy] = useState(false);
  const [detailId, setDetailId] = useState(null);

  const sichtbare = useMemo(
    () =>
      hausaufgaben
        .filter((h) => !h.hiddenBy?.includes(profile.uid))
        .sort((a, b) => (a.faellig || "").localeCompare(b.faellig || "")),
    [hausaufgaben, profile.uid]
  );

  const detail = detailId ? sichtbare.find((h) => h.id === detailId) : null;

  async function handleAdd(e) {
    e.preventDefault();
    if (text.trim().length < 2 || !faellig) return;
    setBusy(true);
    try {
      await addDoc(collection(db, "klassen", klasseId, "kurse", kurs.id, "hausaufgaben"), {
        text: text.trim(),
        faellig,
        autor: profile.nickname,
        autorId: profile.uid,
        doneBy: [],
        hiddenBy: [],
        createdAt: serverTimestamp(),
      });
      setText("");
      setFaellig(todayISO());
    } finally {
      setBusy(false);
    }
  }

  const inputStyle = {
    padding: "9px 12px", borderRadius: radius.sm, border: `1px solid ${t.borderStrong}`,
    background: t.surface, color: t.text, fontSize: 13.5, outline: "none", colorScheme: t.mode,
  };

  return (
    <Card style={{ padding: 16 }}>
      <SectionTitle>📝 Hausaufgaben</SectionTitle>

      {/* Inline-Eingabe – immer oben, kein Modal nötig */}
      <form
        onSubmit={handleAdd}
        style={{
          display: "flex", gap: 8, marginBottom: 14,
          flexDirection: compact ? "column" : "row", flexWrap: "wrap",
        }}
      >
        <input
          placeholder="Neue Hausaufgabe… (Enter zum Speichern)"
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={300}
          style={{ ...inputStyle, flex: 1, minWidth: compact ? undefined : 180 }}
        />
        <div style={{ display: "flex", gap: 8 }}>
          <input
            type="date"
            required
            value={faellig}
            onChange={(e) => setFaellig(e.target.value)}
            style={{ ...inputStyle, flex: compact ? 1 : undefined }}
          />
          <Btn type="submit" small disabled={busy || text.trim().length < 2}>+</Btn>
        </div>
      </form>

      {sichtbare.length === 0 ? (
        <Empty icon="🎉" text="Keine Hausaufgaben" sub="Genieß die Freizeit!" style={{ padding: "22px 10px" }} />
      ) : (
        <div style={{ display: "grid", gap: 7 }}>
          {sichtbare.map((ha) => {
            const done = ha.doneBy?.includes(profile.uid);
            const tage = calcTage(ha.faellig);
            const ueberfaellig = tage !== null && tage < 0 && !done;
            return (
              <div
                key={ha.id}
                onClick={() => setDetailId(ha.id)}
                style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "9px 11px",
                  background: t.surface2, borderRadius: radius.sm, cursor: "pointer",
                  border: `1px solid ${t.border}`, opacity: done ? 0.6 : 1, transition: "opacity .15s",
                }}
              >
                <button
                  onClick={(e) => { e.stopPropagation(); toggleDone(klasseId, kurs.id, ha, profile.uid); }}
                  title={done ? "Als offen markieren" : "Abhaken"}
                  style={{
                    width: 20, height: 20, borderRadius: 6, flexShrink: 0, cursor: "pointer",
                    border: `1.5px solid ${done ? t.success : t.borderStrong}`,
                    background: done ? t.success : "transparent",
                    color: "#fff", fontSize: 11, fontWeight: 800,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                >
                  {done ? "✓" : ""}
                </button>
                <span
                  style={{
                    flex: 1, fontSize: 13.5, color: t.text, minWidth: 0,
                    textDecoration: done ? "line-through" : "none",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}
                >
                  {ha.text}
                </span>
                <span
                  style={{
                    fontSize: 11.5, fontWeight: 700, flexShrink: 0,
                    color: ueberfaellig ? t.danger : tage === 0 ? t.warning : t.textFaint,
                  }}
                >
                  {formatDatum(ha.faellig)}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {detail && (
        <HADetailModal klasseId={klasseId} kurs={kurs} ha={detail} onClose={() => setDetailId(null)} />
      )}
    </Card>
  );
}
