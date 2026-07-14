import { useEffect, useState } from "react";
import { Crown, UserMinus, Users } from "lucide-react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useAuth } from "../../context/AuthContext";
import { useKlasse } from "../../context/KlasseContext";
import { useTheme } from "../../context/ThemeContext";
import { setKursMembership } from "../../lib/klasseActions";
import { radius } from "../../styles/theme";
import { Btn, Empty, Modal, ModalHeader, Spinner } from "../ui/UI";

// Mitgliederliste eines Kurses. Für Kurs-/Klassen-Admins mit Entfernen-Buttons.
export default function KursMitgliederModal({ kurs, onClose }) {
  const { t } = useTheme();
  const { profile } = useAuth();
  const { klasse, canManageKurs } = useKlasse();
  const [users, setUsers] = useState(null);

  // Klassenmitglieder live laden, um uids -> Nicknames aufzulösen
  useEffect(() => {
    const q = query(collection(db, "users"), where("klasseId", "==", klasse.id));
    return onSnapshot(q, (snap) => {
      const map = {};
      snap.docs.forEach((d) => (map[d.id] = d.data().nickname || "Unbekannt"));
      setUsers(map);
    });
  }, [klasse.id]);

  const kannVerwalten = canManageKurs(kurs);
  const memberIds = kurs.memberIds || [];
  const mitglieder = users
    ? memberIds
        .map((uid) => ({ uid, nickname: users[uid] || "Unbekannt" }))
        .sort((a, b) => a.nickname.localeCompare(b.nickname, "de"))
    : null;

  return (
    <Modal width={480} onClose={onClose}>
      <ModalHeader
        title="Kursmitglieder"
        subtitle={`${memberIds.length} ${memberIds.length === 1 ? "Mitglied" : "Mitglieder"} in „${kurs.name}"`}
        onClose={onClose}
      />

      {!mitglieder ? (
        <Spinner center />
      ) : mitglieder.length === 0 ? (
        <Empty icon={Users} text="Noch keine Mitglieder in diesem Kurs" />
      ) : (
        <div style={{ display: "grid", gap: 6, maxHeight: 420, overflowY: "auto", paddingRight: 2 }}>
          {mitglieder.map((m) => {
            const istErsteller = m.uid === kurs.erstellerId;
            const istIch = m.uid === profile.uid;
            return (
              <div
                key={m.uid}
                style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "8px 11px",
                  background: t.surface2, borderRadius: radius.sm, border: `1px solid ${t.border}`,
                }}
              >
                <span
                  style={{
                    width: 30, height: 30, borderRadius: 999,
                    background: istErsteller ? t.warningSoft : t.accentSoft,
                    color: istErsteller ? t.warning : t.accent,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 13, fontWeight: 700, flexShrink: 0,
                  }}
                >
                  {m.nickname?.[0]?.toUpperCase() || "?"}
                </span>
                <span style={{ flex: 1, minWidth: 0, fontSize: 13.5, fontWeight: 500, color: t.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {m.nickname} {istIch && <span style={{ color: t.textFaint }}>(du)</span>}
                </span>
                {istErsteller && (
                  <span style={{ fontSize: 11, fontWeight: 700, color: t.warning, background: t.warningSoft, borderRadius: 999, padding: "2px 9px", display: "inline-flex", alignItems: "center", gap: 4 }}>
                    <Crown size={11} strokeWidth={1.8} /> Ersteller
                  </span>
                )}
                {kannVerwalten && !istErsteller && !istIch && (
                  <Btn small variant="dangerGhost" onClick={() => setKursMembership(klasse.id, kurs.id, m.uid, false)}>
                    <UserMinus size={13.5} strokeWidth={1.8} /> Entfernen
                  </Btn>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
}
