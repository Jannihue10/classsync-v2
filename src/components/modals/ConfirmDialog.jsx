import { useState } from "react";
import { useTheme } from "../../context/ThemeContext";
import { Btn, Modal } from "../ui/UI";

export default function ConfirmDialog({ title, text, confirmLabel = "Löschen", danger = true, onConfirm, onClose }) {
  const { t } = useTheme();
  const [busy, setBusy] = useState(false);

  async function handleConfirm() {
    setBusy(true);
    try {
      await onConfirm();
      onClose();
    } catch {
      setBusy(false);
    }
  }

  return (
    <Modal width={400} onClose={busy ? undefined : onClose}>
      <h2 style={{ margin: "0 0 8px", fontSize: 17, fontWeight: 800, color: t.text }}>{title}</h2>
      <p style={{ margin: "0 0 20px", fontSize: 13.5, color: t.textMuted, lineHeight: 1.55 }}>{text}</p>
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <Btn variant="ghost" onClick={onClose} disabled={busy}>Abbrechen</Btn>
        <Btn variant={danger ? "danger" : "primary"} onClick={handleConfirm} disabled={busy}>
          {busy ? "Bitte warten…" : confirmLabel}
        </Btn>
      </div>
    </Modal>
  );
}
