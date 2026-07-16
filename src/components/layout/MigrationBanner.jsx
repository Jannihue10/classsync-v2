import { useState } from "react";
import { ArrowRightLeft, X } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useMemberships } from "../../context/MembershipsContext";
import { useTheme } from "../../context/ThemeContext";
import { acceptMigration, dismissMigration } from "../../lib/klasseActions";
import { radius } from "../../styles/theme";
import { Btn } from "../ui/UI";

// Zeigt offene Schuljahres-Migrations-Einladungen. Der Nutzer tritt der Zielklasse selbst bei
// (bleibt in der alten) oder verschiebt die Einladung auf später.
export default function MigrationBanner() {
  const { t } = useTheme();
  const { profile } = useAuth();
  const { pendingMigrations } = useMemberships();
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");

  if (!pendingMigrations || pendingMigrations.length === 0) return null;

  async function accept(p) {
    setError("");
    setBusyId(p.migration.id);
    try {
      await acceptMigration(profile.uid, p.migration);
      // Erfolg -> Zielklasse wird aktiv, Baum remountet, Banner verschwindet
    } catch (err) {
      setError(err.message || "Beitritt fehlgeschlagen.");
      setBusyId(null);
    }
  }

  return (
    <div style={{ display: "grid", gap: 8, padding: "12px 20px 0" }}>
      {pendingMigrations.map((p) => (
        <div
          key={p.migration.id}
          style={{
            display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
            padding: "12px 14px", background: t.accentSoft,
            border: `1px solid ${t.accent}44`, borderRadius: radius.md,
          }}
        >
          <span style={{ width: 32, height: 32, borderRadius: 9, background: t.surface, color: t.accent, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <ArrowRightLeft size={17} strokeWidth={1.8} />
          </span>
          <div style={{ flex: 1, minWidth: 180 }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: t.text }}>
              „{p.sourceName}" wurde ins neue Schuljahr übernommen
            </div>
            <div style={{ fontSize: 12.5, color: t.textMuted, marginTop: 1 }}>
              Der neuen Klasse „{p.migration.targetName}" beitreten? Du bleibst weiter Mitglied von „{p.sourceName}".
            </div>
            {error && busyId === null && <div style={{ fontSize: 12, color: t.danger, marginTop: 4 }}>{error}</div>}
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <Btn small onClick={() => accept(p)} disabled={busyId === p.migration.id}>
              {busyId === p.migration.id ? "Beitreten…" : "Beitreten"}
            </Btn>
            <Btn small variant="ghost" onClick={() => dismissMigration(profile.uid, p.migration.id)} disabled={busyId === p.migration.id}>
              <X size={14} strokeWidth={1.8} /> Später
            </Btn>
          </div>
        </div>
      ))}
    </div>
  );
}
