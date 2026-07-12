import { useState } from "react";
import { Palette, Plus, X } from "lucide-react";
import { addDoc, collection, doc, updateDoc } from "firebase/firestore";
import CourseAvatar from "../ui/CourseAvatar";
import { db } from "../../lib/firebase";
import { useAuth } from "../../context/AuthContext";
import { useKlasse } from "../../context/KlasseContext";
import { useTheme } from "../../context/ThemeContext";
import { FACH_VORLAGEN, KURS_FARBEN } from "../../lib/faecher";
import { WOCHENTAGE } from "../../lib/dates";
import { radius } from "../../styles/theme";
import { Btn, Divider, Input, Modal, ModalHeader } from "../ui/UI";

// Kurs erstellen ODER bearbeiten (kurs-Prop gesetzt = Edit-Modus)
export default function KursFormModal({ kurs, onClose }) {
  const { t } = useTheme();
  const { profile } = useAuth();
  const { klasse } = useKlasse();
  const editMode = Boolean(kurs);

  const [name, setName] = useState(kurs?.name || "");
  const [lehrer, setLehrer] = useState(kurs?.lehrer || "");
  const [raum, setRaum] = useState(kurs?.raum || "");
  const [farbe, setFarbe] = useState(kurs?.farbe || KURS_FARBEN[0]);
  const [zeiten, setZeiten] = useState(
    kurs?.zeiten?.length ? kurs.zeiten : [{ day: "Mo", zeit: "08:00", zeitEnde: "09:30" }]
  );
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function applyVorlage(e) {
    const vorlage = FACH_VORLAGEN.find((v) => v.name === e.target.value);
    if (!vorlage) return;
    setName(vorlage.name);
    setFarbe(vorlage.farbe);
  }

  function updateZeit(index, field, value) {
    setZeiten((prev) => prev.map((z, i) => (i === index ? { ...z, [field]: value } : z)));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (name.trim().length < 2) return setError("Der Kursname muss mindestens 2 Zeichen haben.");
    for (const z of zeiten) {
      if (!z.zeit || !z.zeitEnde) return setError("Bitte für jede Stunde Start- und Endzeit angeben.");
      if (z.zeitEnde <= z.zeit) return setError("Die Endzeit muss nach der Startzeit liegen.");
    }
    setBusy(true);
    try {
      const fields = {
        name: name.trim(),
        lehrer: lehrer.trim(),
        raum: raum.trim(),
        zeiten,
        farbe,
      };
      if (editMode) {
        await updateDoc(doc(db, "klassen", klasse.id, "kurse", kurs.id), fields);
      } else {
        await addDoc(collection(db, "klassen", klasse.id, "kurse"), {
          ...fields,
          erstellerId: profile.uid,
          erstellerNick: profile.nickname,
          memberIds: [profile.uid],
          createdAt: Date.now(),
        });
      }
      onClose();
    } catch {
      setError("Speichern fehlgeschlagen. Bitte erneut versuchen.");
      setBusy(false);
    }
  }

  const selectStyle = {
    padding: "9px 10px", borderRadius: radius.sm, border: `1px solid ${t.borderStrong}`,
    background: t.surface, color: t.text, fontSize: 13.5, outline: "none", colorScheme: t.mode,
  };

  return (
    <Modal width={540} onClose={busy ? undefined : onClose}>
      <ModalHeader
        title={editMode ? "Kurs bearbeiten" : "Neuen Kurs erstellen"}
        subtitle={editMode ? undefined : "Du wirst automatisch Kurs-Admin und erstes Mitglied."}
        onClose={busy ? undefined : onClose}
      />
      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 14 }}>
        {!editMode && (
          <label style={{ display: "block" }}>
            <span style={{ display: "block", fontSize: 13, fontWeight: 600, color: t.textMuted, marginBottom: 6 }}>
              Fächervorlage (optional)
            </span>
            <select defaultValue="" onChange={applyVorlage} style={{ ...selectStyle, width: "100%" }}>
              <option value="" disabled>Vorlage wählen – setzt Name & Farbe…</option>
              {FACH_VORLAGEN.map((v) => (
                <option key={v.name} value={v.name}>{v.name}</option>
              ))}
            </select>
          </label>
        )}

        <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
          {/* Live-Vorschau des Monogramms (ergibt sich aus Name + Farbe) */}
          <CourseAvatar name={name || "?"} farbe={farbe} size={40} radius={10} style={{ marginBottom: 1 }} />
          <div style={{ flex: 1 }}>
            <Input
              label="Kursname"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="z. B. Mathematik LK"
              maxLength={40}
            />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Input label="Lehrer" value={lehrer} onChange={(e) => setLehrer(e.target.value)} placeholder="z. B. Fr. Weber" maxLength={40} />
          <Input label="Raum" value={raum} onChange={(e) => setRaum(e.target.value)} placeholder="z. B. B204" maxLength={20} />
        </div>

        {/* Farbe */}
        <div>
          <span style={{ display: "block", fontSize: 13, fontWeight: 600, color: t.textMuted, marginBottom: 6 }}>Farbe</span>
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap", alignItems: "center" }}>
            {KURS_FARBEN.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFarbe(f)}
                aria-label={`Farbe ${f}`}
                style={{
                  width: 26, height: 26, borderRadius: 999, background: f, cursor: "pointer",
                  border: farbe === f ? `3px solid ${t.text}` : `2px solid ${t.border}`,
                }}
              />
            ))}
            <label
              title="Eigene Farbe wählen"
              style={{
                width: 26, height: 26, borderRadius: 999, overflow: "hidden", cursor: "pointer",
                border: `2px dashed ${t.borderStrong}`, display: "flex",
                alignItems: "center", justifyContent: "center", fontSize: 12, color: t.textMuted,
                background: KURS_FARBEN.includes(farbe) ? "transparent" : farbe,
              }}
            >
              <Palette size={13} strokeWidth={1.8} />
              <input
                type="color"
                value={farbe}
                onChange={(e) => setFarbe(e.target.value)}
                style={{ position: "absolute", opacity: 0, width: 0, height: 0 }}
              />
            </label>
          </div>
        </div>

        <Divider style={{ margin: "4px 0" }} />

        {/* Stundenplan-Zeiten */}
        <div>
          <span style={{ display: "block", fontSize: 13, fontWeight: 600, color: t.textMuted, marginBottom: 6 }}>
            Unterrichtszeiten
          </span>
          <div style={{ display: "grid", gap: 8 }}>
            {zeiten.map((z, i) => (
              <div key={i} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <select value={z.day} onChange={(e) => updateZeit(i, "day", e.target.value)} style={selectStyle}>
                  {WOCHENTAGE.map((tag) => <option key={tag} value={tag}>{tag}</option>)}
                </select>
                <input
                  type="time" required value={z.zeit}
                  onChange={(e) => updateZeit(i, "zeit", e.target.value)}
                  style={{ ...selectStyle, flex: 1 }}
                />
                <span style={{ color: t.textFaint, fontSize: 13 }}>–</span>
                <input
                  type="time" required value={z.zeitEnde}
                  onChange={(e) => updateZeit(i, "zeitEnde", e.target.value)}
                  style={{ ...selectStyle, flex: 1 }}
                />
                <button
                  type="button"
                  onClick={() => setZeiten((prev) => prev.filter((_, j) => j !== i))}
                  disabled={zeiten.length === 1}
                  aria-label="Zeit entfernen"
                  style={{
                    background: "none", border: "none", cursor: zeiten.length === 1 ? "not-allowed" : "pointer",
                    color: zeiten.length === 1 ? t.textFaint : t.danger, padding: 4,
                    display: "flex", alignItems: "center",
                  }}
                >
                  <X size={15} strokeWidth={2} />
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setZeiten((prev) => [...prev, { day: "Mo", zeit: "08:00", zeitEnde: "09:30" }])}
            style={{
              marginTop: 8, background: "none", border: `1px dashed ${t.borderStrong}`,
              borderRadius: radius.sm, padding: "7px 12px", color: t.textMuted,
              fontSize: 12.5, fontWeight: 500, cursor: "pointer", width: "100%",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            }}
          >
            <Plus size={13} strokeWidth={2} /> Weitere Stunde
          </button>
        </div>

        {error && <p style={{ margin: 0, color: t.danger, fontSize: 13 }}>{error}</p>}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 4 }}>
          <Btn variant="ghost" type="button" onClick={onClose} disabled={busy}>Abbrechen</Btn>
          <Btn type="submit" disabled={busy}>
            {busy ? "Speichern…" : editMode ? "Speichern" : "Kurs erstellen"}
          </Btn>
        </div>
      </form>
    </Modal>
  );
}
