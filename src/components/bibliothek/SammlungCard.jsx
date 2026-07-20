import { Library, Users } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import { radius } from "../../styles/theme";
import PruefungChip, { isPruefungVerwaist } from "./PruefungChip";

// Kachel einer Sammlung in der Bibliothek.
export default function SammlungCard({ sammlung, pruefungen, onOpen }) {
  const { t } = useTheme();
  const anzahl = (sammlung.items || []).length;
  const geteilt = (sammlung.memberIds || []).length > 1;

  return (
    <div
      onClick={onOpen}
      style={{
        background: t.surface, border: `1px solid ${t.border}`, borderRadius: radius.md,
        boxShadow: t.shadow, cursor: "pointer", padding: 14,
        display: "flex", alignItems: "center", gap: 12,
        transition: "border-color .12s, transform .08s",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = t.borderStrong; e.currentTarget.style.transform = "translateY(-1px)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = t.border; e.currentTarget.style.transform = "none"; }}
    >
      <span
        style={{
          width: 40, height: 40, borderRadius: radius.sm, flexShrink: 0,
          background: t.accentSoft, color: t.accent,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        <Library size={20} strokeWidth={1.8} />
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", fontSize: 14, fontWeight: 700, color: t.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {sammlung.name}
        </span>
        <span style={{ fontSize: 12, color: t.textFaint, display: "inline-flex", alignItems: "center", gap: 6, marginTop: 2 }}>
          {anzahl} {anzahl === 1 ? "Material" : "Materialien"}
          {geteilt && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
              · <Users size={11} strokeWidth={1.8} /> geteilt
            </span>
          )}
        </span>
        {sammlung.pruefung && (
          <span style={{ display: "flex", marginTop: 4, minWidth: 0 }}>
            <PruefungChip
              pruefung={sammlung.pruefung}
              verwaist={isPruefungVerwaist(sammlung.pruefung, pruefungen)}
              compact
            />
          </span>
        )}
      </span>
    </div>
  );
}
