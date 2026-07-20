import { useState } from "react";
import { ArrowRightLeft, GraduationCap, Plus } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useKlasse } from "../../context/KlasseContext";
import { useMemberships } from "../../context/MembershipsContext";
import { useTheme } from "../../context/ThemeContext";
import { acceptMigration, switchActiveKlasse } from "../../lib/klasseActions";
import { radius } from "../../styles/theme";
import { Btn, Card, Divider, SectionTitle } from "../ui/UI";

// Multi-Klassen-Wechsler + offene Migrations-Einladungen
export default function KlassenListe({ onOpenAddKlasse }) {
  const { t } = useTheme();
  const { profile } = useAuth();
  const { klasse } = useKlasse();
  const { myClasses, openMigrations } = useMemberships();
  const [inviteBusy, setInviteBusy] = useState(null);

  return (
    <Card style={{ padding: 18 }}>
      <SectionTitle
        action={
          <Btn small variant="soft" onClick={onOpenAddKlasse}>
            <Plus size={14} strokeWidth={2} /> Klasse hinzufügen
          </Btn>
        }
      >
        Deine Klassen
      </SectionTitle>

      <div style={{ display: "grid", gap: 6 }}>
        {myClasses.map((c) => {
          const aktiv = c.id === klasse.id;
          return (
            <div
              key={c.id}
              style={{
                display: "flex", alignItems: "center", gap: 10, padding: "8px 11px",
                background: t.surface2, borderRadius: radius.sm,
                border: `1px solid ${aktiv ? `${t.accent}66` : t.border}`,
              }}
            >
              <span
                style={{
                  width: 30, height: 30, borderRadius: 8, background: t.accentSoft, color: t.accent,
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}
              >
                <GraduationCap size={16} strokeWidth={1.8} />
              </span>
              <span style={{ flex: 1, minWidth: 0, fontSize: 13.5, fontWeight: 500, color: t.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {c.name}
              </span>
              {aktiv ? (
                <span style={{ fontSize: 11, fontWeight: 700, color: t.accent, background: t.accentSoft, borderRadius: 999, padding: "2px 9px" }}>
                  Aktiv
                </span>
              ) : (
                <Btn small variant="soft" onClick={() => switchActiveKlasse(profile.uid, c.id)}>
                  <ArrowRightLeft size={13} strokeWidth={1.8} /> Wechseln
                </Btn>
              )}
            </div>
          );
        })}
      </div>

      {/* Offene Migrations-Einladungen (auch nach „Später" hier annehmbar) */}
      {openMigrations.length > 0 && (
        <>
          <Divider />
          <div style={{ fontSize: 12.5, fontWeight: 700, color: t.textMuted, marginBottom: 8 }}>
            Offene Einladungen ({openMigrations.length})
          </div>
          <div style={{ display: "grid", gap: 6 }}>
            {openMigrations.map((p) => (
              <div
                key={p.migration.id}
                style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "8px 11px",
                  background: t.accentSoft, borderRadius: radius.sm, border: `1px solid ${t.accent}44`,
                }}
              >
                <span style={{ width: 30, height: 30, borderRadius: 8, background: t.surface, color: t.accent, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <ArrowRightLeft size={15} strokeWidth={1.8} />
                </span>
                <span style={{ flex: 1, minWidth: 0, fontSize: 13, color: t.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  <b>{p.migration.targetName}</b> <span style={{ color: t.textMuted }}>(aus „{p.sourceName}")</span>
                </span>
                <Btn
                  small
                  disabled={inviteBusy === p.migration.id}
                  onClick={async () => {
                    setInviteBusy(p.migration.id);
                    try { await acceptMigration(profile.uid, p.migration); }
                    catch { setInviteBusy(null); }
                  }}
                >
                  {inviteBusy === p.migration.id ? "Beitreten…" : "Beitreten"}
                </Btn>
              </div>
            ))}
          </div>
        </>
      )}
    </Card>
  );
}
