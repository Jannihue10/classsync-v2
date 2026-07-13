import { useState } from "react";
import { Check, FolderPlus, Library, Users } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useKlasse } from "../../context/KlasseContext";
import { useTheme } from "../../context/ThemeContext";
import { useSammlungen } from "../../lib/useSammlungen";
import {
  addItem, createSammlung, isInSammlung, itemFromMaterial, removeItem,
} from "../../lib/sammlungActions";
import { radius } from "../../styles/theme";
import { Btn, Modal, ModalHeader, Spinner } from "../ui/UI";

// Material zu einer oder mehreren Sammlungen hinzufügen/entfernen.
export default function AddToSammlungModal({ mat, onClose }) {
  const { t } = useTheme();
  const { profile } = useAuth();
  const { klasse } = useKlasse();
  const { alle, loading } = useSammlungen();
  const [neuOpen, setNeuOpen] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  const item = itemFromMaterial(mat);

  async function toggle(sammlung) {
    if (isInSammlung(sammlung, mat.id)) {
      await removeItem(klasse.id, sammlung, mat.id);
    } else {
      await addItem(klasse.id, sammlung, item);
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (name.trim().length < 1 || busy) return;
    setBusy(true);
    try {
      const ref = await createSammlung(klasse.id, {
        name,
        ownerId: profile.uid,
        ownerNick: profile.nickname,
      });
      // Frisch erstellte Sammlung direkt mit dem Material bestücken
      await addItem(klasse.id, { id: ref.id, items: [] }, item);
      setName("");
      setNeuOpen(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal width={440} onClose={onClose}>
      <ModalHeader
        title="Zu Sammlung hinzufügen"
        subtitle={mat.titel}
        onClose={onClose}
      />

      {loading ? (
        <Spinner center />
      ) : (
        <div style={{ display: "grid", gap: 6 }}>
          {alle.length === 0 && !neuOpen && (
            <p style={{ margin: "4px 0 8px", fontSize: 13, color: t.textMuted, lineHeight: 1.55 }}>
              Noch keine Sammlungen. Lege deine erste an, um Materialien für z.&nbsp;B. eine Prüfung zu bündeln.
            </p>
          )}

          {alle.map((s) => {
            const drin = isInSammlung(s, mat.id);
            const geteilt = (s.memberIds || []).length > 1;
            return (
              <button
                key={s.id}
                onClick={() => toggle(s)}
                style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "9px 11px",
                  background: t.surface2, borderRadius: radius.sm,
                  border: `1px solid ${drin ? t.accent : t.border}`, cursor: "pointer", textAlign: "left",
                }}
              >
                <Library size={16} strokeWidth={1.8} color={drin ? t.accent : t.textMuted} />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: "block", fontSize: 13.5, fontWeight: 600, color: t.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {s.name}
                  </span>
                  <span style={{ fontSize: 11.5, color: t.textFaint, display: "inline-flex", alignItems: "center", gap: 5 }}>
                    {(s.items || []).length} {((s.items || []).length === 1) ? "Material" : "Materialien"}
                    {geteilt && (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                        · <Users size={11} strokeWidth={1.8} /> geteilt
                      </span>
                    )}
                  </span>
                </span>
                <span
                  style={{
                    width: 20, height: 20, borderRadius: 6, flexShrink: 0,
                    border: `1.5px solid ${drin ? t.accent : t.borderStrong}`,
                    background: drin ? t.accent : "transparent",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                >
                  {drin && <Check size={13} strokeWidth={2.4} color={t.accentText} />}
                </span>
              </button>
            );
          })}

          {neuOpen ? (
            <form onSubmit={handleCreate} style={{ display: "flex", gap: 8, marginTop: 4 }}>
              <input
                autoFocus
                placeholder="Name der Sammlung…"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={60}
                style={{
                  flex: 1, padding: "9px 12px", borderRadius: radius.sm, border: `1px solid ${t.borderStrong}`,
                  background: t.surface, color: t.text, fontSize: 13.5, outline: "none",
                }}
              />
              <Btn small type="submit" disabled={busy || name.trim().length < 1}>
                {busy ? "…" : "Anlegen"}
              </Btn>
            </form>
          ) : (
            <button
              onClick={() => setNeuOpen(true)}
              style={{
                marginTop: 4, width: "100%", padding: "9px 12px", borderRadius: radius.sm,
                background: "transparent", border: `1px dashed ${t.borderStrong}`,
                color: t.textMuted, fontSize: 13, fontWeight: 500, cursor: "pointer",
                display: "flex", alignItems: "center", gap: 7, justifyContent: "center",
              }}
            >
              <FolderPlus size={15} strokeWidth={1.8} /> Neue Sammlung anlegen
            </button>
          )}
        </div>
      )}
    </Modal>
  );
}
