import { useMemo, useState } from "react";
import { BookOpen, Check } from "lucide-react";
import CourseAvatar from "../ui/CourseAvatar";
import { useAuth } from "../../context/AuthContext";
import { useKlasse } from "../../context/KlasseContext";
import { useTheme } from "../../context/ThemeContext";
import { setKursMembership } from "../../lib/klasseActions";
import { radius } from "../../styles/theme";
import { Btn, Empty, Input, Modal, ModalHeader } from "../ui/UI";

// Kursauswahl: alle Kurse der Klasse als Toggle-Karten mit Suche + Alle wählen/abwählen
export default function KurswahlModal({ onClose }) {
  const { t } = useTheme();
  const { profile } = useAuth();
  const { klasse, kurse } = useKlasse();
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState(
    () => new Set(kurse.filter((k) => k.memberIds?.includes(profile.uid)).map((k) => k.id))
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return kurse;
    return kurse.filter(
      (k) => k.name.toLowerCase().includes(q) || (k.lehrer || "").toLowerCase().includes(q)
    );
  }, [kurse, search]);

  function toggle(kursId) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(kursId) ? next.delete(kursId) : next.add(kursId);
      return next;
    });
  }

  async function handleSave() {
    setBusy(true);
    try {
      const changes = kurse
        .filter((k) => k.memberIds?.includes(profile.uid) !== selected.has(k.id))
        .map((k) => setKursMembership(klasse.id, k.id, profile.uid, selected.has(k.id)));
      await Promise.all(changes);
      onClose();
    } catch {
      setBusy(false);
    }
  }

  return (
    <Modal width={560} onClose={busy ? undefined : onClose}>
      <ModalHeader
        title="Kurse wählen"
        subtitle="Wähle die Kurse, die du besuchst – sie erscheinen in deiner Sidebar und im Kalender."
        onClose={busy ? undefined : onClose}
      />

      {kurse.length === 0 ? (
        <Empty
          icon={BookOpen}
          text="Noch keine Kurse in dieser Klasse"
          sub={'Erstelle den ersten Kurs über das „+" in der Sidebar.'}
        />
      ) : (
        <>
          <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 180 }}>
              <Input
                placeholder="Kurs oder Lehrer suchen…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Btn variant="soft" small onClick={() => setSelected(new Set(kurse.map((k) => k.id)))}>
              Alle wählen
            </Btn>
            <Btn variant="soft" small onClick={() => setSelected(new Set())}>
              Alle abwählen
            </Btn>
          </div>

          <div style={{ display: "grid", gap: 8, maxHeight: 380, overflowY: "auto", paddingRight: 2 }}>
            {filtered.length === 0 && (
              <p style={{ textAlign: "center", color: t.textMuted, fontSize: 13.5, padding: 20 }}>
                Keine Kurse gefunden.
              </p>
            )}
            {filtered.map((kurs) => {
              const active = selected.has(kurs.id);
              return (
                <button
                  key={kurs.id}
                  onClick={() => toggle(kurs.id)}
                  style={{
                    display: "flex", alignItems: "center", gap: 12, padding: "11px 14px",
                    borderRadius: radius.md, cursor: "pointer", textAlign: "left",
                    background: active ? t.accentSoft : t.surface2,
                    border: `1.5px solid ${active ? t.accent : t.border}`,
                    transition: "border-color .12s, background .12s",
                  }}
                >
                  <CourseAvatar name={kurs.name} farbe={kurs.farbe} size={34} radius={9} />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: "block", fontWeight: 600, fontSize: 14, color: t.text }}>
                      {kurs.name}
                    </span>
                    <span style={{ display: "block", fontSize: 12, color: t.textMuted }}>
                      {[kurs.lehrer, `${kurs.memberIds?.length || 0} Mitglieder`].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                  <span
                    style={{
                      width: 22, height: 22, borderRadius: 999, flexShrink: 0, fontSize: 12,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      background: active ? t.accent : "transparent",
                      border: `1.5px solid ${active ? t.accent : t.borderStrong}`,
                      color: t.accentText,
                    }}
                  >
                    {active && <Check size={13} strokeWidth={2.5} />}
                  </span>
                </button>
              );
            })}
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 18 }}>
            <Btn variant="ghost" onClick={onClose} disabled={busy}>Abbrechen</Btn>
            <Btn onClick={handleSave} disabled={busy}>
              {busy ? "Speichern…" : `Speichern (${selected.size} gewählt)`}
            </Btn>
          </div>
        </>
      )}
    </Modal>
  );
}
