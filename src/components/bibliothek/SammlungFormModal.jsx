import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useKlasse } from "../../context/KlasseContext";
import { createSammlung } from "../../lib/sammlungActions";
import { Btn, Input, Modal, ModalHeader } from "../ui/UI";
import PruefungSelect from "./PruefungSelect";

// Neue Sammlung anlegen: Name + optionale Prüfung, für die sie gedacht ist.
export default function SammlungFormModal({ pruefungen, onClose, onCreated }) {
  const { profile } = useAuth();
  const { klasse } = useKlasse();
  const [name, setName] = useState("");
  const [pruefung, setPruefung] = useState(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (name.trim().length < 1 || busy) return;
    setBusy(true);
    try {
      const ref = await createSammlung(klasse.id, {
        name,
        ownerId: profile.uid,
        ownerNick: profile.nickname,
        pruefung,
      });
      onCreated?.(ref.id);
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal width={460} onClose={onClose}>
      <ModalHeader
        title="Neue Sammlung"
        subtitle="Bündle Materialien – optional für eine bestimmte Prüfung."
        onClose={onClose}
      />
      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 14 }}>
        <Input
          autoFocus
          label="Name"
          placeholder="z. B. Analysis-Klausur"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={60}
        />
        <PruefungSelect
          label="Für welche Prüfung?"
          pruefungen={pruefungen}
          value={pruefung}
          onChange={setPruefung}
        />
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
          <Btn variant="ghost" type="button" onClick={onClose}>Abbrechen</Btn>
          <Btn type="submit" disabled={busy || name.trim().length < 1}>
            {busy ? "…" : "Anlegen"}
          </Btn>
        </div>
      </form>
    </Modal>
  );
}
