import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarCheck, Library, Plus, Trash2 } from "lucide-react";
import { addDoc, collection, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useAuth } from "../../context/AuthContext";
import { useKlasse } from "../../context/KlasseContext";
import { useTheme } from "../../context/ThemeContext";
import { calcTage, formatDatum, tageLabel, todayISO } from "../../lib/dates";
import { useSammlungen } from "../../lib/useSammlungen";
import { radius } from "../../styles/theme";
import { Btn, Card, Empty, Pill, SectionTitle } from "../ui/UI";

// Countdown-Farbe: rot <= 7 Tage, gelb <= 14, grün > 14
export function pruefungColor(tage, t) {
  if (tage === null || tage < 0) return t.textFaint;
  if (tage <= 7) return t.danger;
  if (tage <= 14) return t.warning;
  return t.success;
}

export default function PruefungenSection({ klasseId, kurs, pruefungen, compact }) {
  const { t } = useTheme();
  const { profile } = useAuth();
  const { isKlassenAdmin } = useKlasse();
  const navigate = useNavigate();
  const { alle: sammlungen } = useSammlungen();
  const [titel, setTitel] = useState("");
  const [datum, setDatum] = useState("");
  const [busy, setBusy] = useState(false);

  // Sammlungen, die für eine Prüfung angelegt wurden. Der Hook liefert nur eigene
  // und mit mir geteilte – fremde private Sammlungen bleiben also unsichtbar.
  const sammlungenByPruefung = useMemo(() => {
    const map = {};
    for (const s of sammlungen) {
      const prId = s.pruefung?.prId;
      if (!prId) continue;
      (map[prId] ||= []).push(s);
    }
    return map;
  }, [sammlungen]);

  // Kommende zuerst (nach Nähe), vergangene ausgegraut ans Ende
  const sorted = useMemo(() => {
    const withTage = pruefungen.map((p) => ({ ...p, tage: calcTage(p.datum) }));
    const kommend = withTage.filter((p) => p.tage !== null && p.tage >= 0).sort((a, b) => a.tage - b.tage);
    const vorbei = withTage.filter((p) => p.tage === null || p.tage < 0).sort((a, b) => (b.tage ?? 0) - (a.tage ?? 0));
    return [...kommend, ...vorbei];
  }, [pruefungen]);

  async function handleAdd(e) {
    e.preventDefault();
    if (titel.trim().length < 2 || !datum) return;
    setBusy(true);
    try {
      await addDoc(collection(db, "klassen", klasseId, "kurse", kurs.id, "pruefungen"), {
        titel: titel.trim(),
        datum,
        autor: profile.nickname,
        autorId: profile.uid,
        createdAt: serverTimestamp(),
      });
      setTitel("");
      setDatum("");
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
      <SectionTitle>Prüfungen</SectionTitle>

      <form
        onSubmit={handleAdd}
        style={{ display: "flex", gap: 8, marginBottom: 14, flexDirection: compact ? "column" : "row", flexWrap: "wrap" }}
      >
        <input
          placeholder="Prüfung, z. B. Klausur Analysis…"
          value={titel}
          onChange={(e) => setTitel(e.target.value)}
          maxLength={80}
          style={{ ...inputStyle, flex: 1, minWidth: compact ? undefined : 160 }}
        />
        <div style={{ display: "flex", gap: 8 }}>
          <input
            type="date"
            required
            min={todayISO()}
            value={datum}
            onChange={(e) => setDatum(e.target.value)}
            style={{ ...inputStyle, flex: compact ? 1 : undefined }}
          />
          <Btn type="submit" small disabled={busy || titel.trim().length < 2 || !datum} aria-label="Hinzufügen">
            <Plus size={15} strokeWidth={2} />
          </Btn>
        </div>
      </form>

      {sorted.length === 0 ? (
        <Empty icon={CalendarCheck} text="Keine Prüfungen eingetragen" sub="Entspann dich – oder trag die nächste ein." style={{ padding: "22px 10px" }} />
      ) : (
        <div style={{ display: "grid", gap: 7 }}>
          {sorted.map((pr) => {
            const vorbei = pr.tage === null || pr.tage < 0;
            const color = pruefungColor(pr.tage, t);
            const canDelete = pr.autorId === profile.uid || isKlassenAdmin;
            const meineSammlungen = sammlungenByPruefung[pr.id] || [];
            return (
              <div
                key={pr.id}
                style={{
                  display: "flex", flexDirection: "column", gap: 8, padding: "9px 11px",
                  background: t.surface2, borderRadius: radius.sm,
                  border: `1px solid ${t.border}`, opacity: vorbei ? 0.55 : 1,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span
                    style={{
                      display: "block", fontSize: 13.5, fontWeight: 600, color: t.text,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}
                  >
                    {pr.titel}
                  </span>
                  <span style={{ fontSize: 11.5, color: t.textFaint }}>
                    {formatDatum(pr.datum)} · von {pr.autor}
                  </span>
                </span>
                <Pill label={vorbei ? "vorbei" : tageLabel(pr.tage)} color={color} />
                {canDelete && (
                  <button
                    onClick={() => deleteDoc(doc(db, "klassen", klasseId, "kurse", kurs.id, "pruefungen", pr.id))}
                    title="Löschen"
                    style={{ background: "none", border: "none", cursor: "pointer", color: t.textFaint, padding: 2, display: "flex", alignItems: "center" }}
                  >
                    <Trash2 size={13.5} strokeWidth={1.8} />
                  </button>
                )}
                </div>

                {/* Sammlungen, die für diese Prüfung zusammengestellt wurden */}
                {meineSammlungen.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {meineSammlungen.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => navigate(`/bibliothek?sammlung=${s.id}`)}
                        title="Sammlung öffnen"
                        style={{
                          display: "inline-flex", alignItems: "center", gap: 5, maxWidth: "100%",
                          padding: "3px 9px", borderRadius: radius.full, cursor: "pointer",
                          background: t.accentSoft, color: t.accent, border: "none",
                          fontSize: 11.5, fontWeight: 600,
                        }}
                      >
                        <Library size={12} strokeWidth={1.8} style={{ flexShrink: 0 }} />
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {s.name}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
