import { useMemo } from "react";
import { CalendarDays } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import { formatDatum, naechsteStunden } from "../../lib/dates";
import { radius } from "../../styles/theme";

// Schnellwahl für das Fälligkeitsdatum: die nächsten Termine des Kurses aus `zeiten`.
// Rendert nichts, wenn der Kurs keine Zeiten hinterlegt hat.
export default function StundenChips({ zeiten, value, onPick, style }) {
  const { t } = useTheme();
  const stunden = useMemo(() => naechsteStunden(zeiten, 2), [zeiten]);
  if (stunden.length === 0) return null;

  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", ...style }}>
      {stunden.map((s, i) => {
        const aktiv = s.iso === value;
        const datum = formatDatum(s.iso).slice(0, 6); // "22.07."
        return (
          <button
            key={s.iso}
            type="button"
            onClick={() => onPick(s.iso)}
            title={`${i === 0 ? "Nächste" : "Übernächste"} Stunde – ${s.day}, ${formatDatum(s.iso)} um ${s.zeit}`}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "7px 13px", borderRadius: radius.full,
              fontSize: 12.5, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap",
              background: aktiv ? `${t.accent}22` : t.surface,
              color: aktiv ? t.accent : t.textMuted,
              border: `1.5px solid ${aktiv ? t.accent : t.border}`,
            }}
          >
            <CalendarDays size={13} strokeWidth={1.8} />
            {i === 0 ? "Nächste Stunde · " : ""}{s.day} {datum}
          </button>
        );
      })}
    </div>
  );
}
