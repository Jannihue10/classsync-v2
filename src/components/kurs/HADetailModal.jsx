import { useState } from "react";
import { Check, EyeOff, Pencil, Trash2, Undo2 } from "lucide-react";
import { deleteDoc, updateDoc } from "firebase/firestore";
import { useAuth } from "../../context/AuthContext";
import { useKlasse } from "../../context/KlasseContext";
import { useTheme } from "../../context/ThemeContext";
import { calcTage, formatDatum } from "../../lib/dates";
import { radius } from "../../styles/theme";
import { Btn, Divider, Input, Modal, ModalHeader } from "../ui/UI";
import { haRef, hideForMe, toggleDone } from "./HASection";

export default function HADetailModal({ klasseId, kurs, ha, onClose }) {
  const { t } = useTheme();
  const { profile } = useAuth();
  const { isKlassenAdmin } = useKlasse();

  const canEdit = ha.autorId === profile.uid || isKlassenAdmin;
  const done = ha.doneBy?.includes(profile.uid);
  const tage = calcTage(ha.faellig);
  const ueberfaellig = tage !== null && tage < 0 && !done;

  const [editMode, setEditMode] = useState(false);
  const [text, setText] = useState(ha.text);
  const [faellig, setFaellig] = useState(ha.faellig);
  const [busy, setBusy] = useState(false);

  async function handleSave(e) {
    e.preventDefault();
    if (text.trim().length < 2 || !faellig) return;
    setBusy(true);
    try {
      await updateDoc(haRef(klasseId, kurs.id, ha.id), { text: text.trim(), faellig });
      setEditMode(false);
    } finally {
      setBusy(false);
    }
  }

  async function handleHideForMe() {
    setBusy(true);
    await hideForMe(klasseId, kurs, ha, profile.uid, isKlassenAdmin);
    onClose();
  }

  async function handleDeleteForAll() {
    setBusy(true);
    await deleteDoc(haRef(klasseId, kurs.id, ha.id));
    onClose();
  }

  return (
    <Modal width={460} onClose={busy ? undefined : onClose}>
      <ModalHeader title="Hausaufgabe" onClose={busy ? undefined : onClose} />

      {editMode ? (
        <form onSubmit={handleSave} style={{ display: "grid", gap: 14 }}>
          <Input label="Aufgabe" required value={text} onChange={(e) => setText(e.target.value)} maxLength={300} textarea />
          <Input label="Fällig am" type="date" required value={faellig} onChange={(e) => setFaellig(e.target.value)} />
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <Btn variant="ghost" type="button" onClick={() => setEditMode(false)} disabled={busy}>Abbrechen</Btn>
            <Btn type="submit" disabled={busy}>{busy ? "Speichern…" : "Speichern"}</Btn>
          </div>
        </form>
      ) : (
        <>
          <p style={{ margin: "0 0 14px", fontSize: 15, color: t.text, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
            {ha.text}
          </p>
          <div
            style={{
              display: "grid", gap: 8, background: t.surface2, borderRadius: radius.sm,
              padding: "12px 14px", fontSize: 13, color: t.textMuted,
            }}
          >
            <span>
              Fällig:{" "}
              <b style={{ color: ueberfaellig ? t.danger : t.text }}>
                {formatDatum(ha.faellig)}
                {tage !== null && tage >= 0 && ` (${tage === 0 ? "heute" : tage === 1 ? "morgen" : `in ${tage} Tagen`})`}
                {ueberfaellig && " – überfällig"}
              </b>
            </span>
            <span>Eingetragen von <b style={{ color: t.text }}>{ha.autor}</b></span>
            <span>Erledigt von {ha.doneBy?.length || 0} von {kurs.memberIds?.length || 0} Mitgliedern</span>
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
            <Btn small variant={done ? "soft" : "success"} onClick={() => toggleDone(klasseId, kurs.id, ha, profile.uid)}>
              {done ? (
                <>
                  <Undo2 size={14} strokeWidth={1.8} /> Doch nicht erledigt
                </>
              ) : (
                <>
                  <Check size={14} strokeWidth={2} /> Erledigt
                </>
              )}
            </Btn>
            {canEdit && (
              <Btn small variant="ghost" onClick={() => setEditMode(true)}>
                <Pencil size={13.5} strokeWidth={1.8} /> Bearbeiten
              </Btn>
            )}
          </div>

          <Divider />

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Btn small variant="ghost" onClick={handleHideForMe} disabled={busy}>
              <EyeOff size={13.5} strokeWidth={1.8} /> Für mich löschen
            </Btn>
            {canEdit && (
              <Btn small variant="dangerGhost" onClick={handleDeleteForAll} disabled={busy}>
                <Trash2 size={13.5} strokeWidth={1.8} /> Für alle löschen
              </Btn>
            )}
          </div>
          <p style={{ margin: "10px 0 0", fontSize: 11.5, color: t.textFaint, lineHeight: 1.5 }}>
            „Für mich löschen" entfernt die HA nur aus deiner Ansicht – andere sehen sie weiterhin.
          </p>
        </>
      )}
    </Modal>
  );
}
