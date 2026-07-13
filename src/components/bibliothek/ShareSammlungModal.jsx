import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { Check } from "lucide-react";
import { db } from "../../lib/firebase";
import { useAuth } from "../../context/AuthContext";
import { useKlasse } from "../../context/KlasseContext";
import { useTheme } from "../../context/ThemeContext";
import { setSammlungMembers } from "../../lib/sammlungActions";
import { radius } from "../../styles/theme";
import { Modal, ModalHeader, Spinner } from "../ui/UI";

// Nur der Owner: Klassenmitglieder zur Sammlung hinzufügen/entfernen (Kollaboration).
export default function ShareSammlungModal({ sammlung, onClose }) {
  const { t } = useTheme();
  const { profile } = useAuth();
  const { klasse } = useKlasse();
  const [mitglieder, setMitglieder] = useState(null);

  // Klassenmitglieder live (gleiches Muster wie ProfilPage)
  useEffect(() => {
    const q = query(collection(db, "users"), where("klasseId", "==", klasse.id));
    return onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({ uid: d.id, ...d.data() }));
      list.sort((a, b) => a.nickname.localeCompare(b.nickname, "de"));
      setMitglieder(list);
    });
  }, [klasse.id]);

  const memberIds = sammlung.memberIds || [];

  function toggle(uid) {
    if (uid === sammlung.ownerId) return; // Owner bleibt immer drin
    const next = memberIds.includes(uid)
      ? memberIds.filter((id) => id !== uid)
      : [...memberIds, uid];
    setSammlungMembers(klasse.id, sammlung.id, next);
  }

  return (
    <Modal width={440} onClose={onClose}>
      <ModalHeader
        title="Sammlung teilen"
        subtitle="Wähle Klassenmitglieder – sie dürfen Materialien hinzufügen und entfernen."
        onClose={onClose}
      />

      {!mitglieder ? (
        <Spinner center />
      ) : (
        <div style={{ display: "grid", gap: 6 }}>
          {mitglieder.map((m) => {
            const istOwner = m.uid === sammlung.ownerId;
            const drin = memberIds.includes(m.uid);
            return (
              <button
                key={m.uid}
                onClick={() => toggle(m.uid)}
                disabled={istOwner}
                style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "8px 11px",
                  background: t.surface2, borderRadius: radius.sm,
                  border: `1px solid ${drin ? t.accent : t.border}`,
                  cursor: istOwner ? "default" : "pointer", textAlign: "left",
                  opacity: istOwner ? 0.75 : 1,
                }}
              >
                <span
                  style={{
                    width: 30, height: 30, borderRadius: 999, background: t.accentSoft, color: t.accent,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 13, fontWeight: 700, flexShrink: 0,
                  }}
                >
                  {m.nickname?.[0]?.toUpperCase() || "?"}
                </span>
                <span style={{ flex: 1, minWidth: 0, fontSize: 13.5, fontWeight: 500, color: t.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {m.nickname} {m.uid === profile.uid && <span style={{ color: t.textFaint }}>(du)</span>}
                  {istOwner && <span style={{ color: t.textFaint }}> · Ersteller</span>}
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
        </div>
      )}
    </Modal>
  );
}
