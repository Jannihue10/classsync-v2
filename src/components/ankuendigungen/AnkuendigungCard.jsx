import { CalendarClock, Megaphone, Pencil } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { formatDatum, relativeTime } from "../../lib/dates";
import { istGelesen, terminLabel } from "../../lib/ankuendigungActions";
import { radius } from "../../styles/theme";
import { Pill, Tag } from "../ui/UI";
import DateiIcon from "../ui/DateiIcon";

// Listeneintrag einer Ankündigung (Seite + Glocken-Panel).
// Akzentfarbe statt Kursfarbe: die Ankündigung gehört der Klasse, nicht einem Kurs.
export default function AnkuendigungCard({ ank, onClick, compact }) {
  const { t } = useTheme();
  const { profile } = useAuth();
  const gelesen = istGelesen(ank, profile.uid);

  return (
    <button
      onClick={onClick}
      style={{
        display: "flex", alignItems: "flex-start", gap: 11, width: "100%", textAlign: "left",
        padding: compact ? "10px 12px" : "13px 15px",
        background: gelesen ? t.surface2 : t.accentSoft,
        border: `1px solid ${gelesen ? t.border : `${t.accent}55`}`,
        borderRadius: radius.md, cursor: "pointer",
      }}
      onMouseEnter={(e) => gelesen && (e.currentTarget.style.background = t.surfaceHover)}
      onMouseLeave={(e) => gelesen && (e.currentTarget.style.background = t.surface2)}
    >
      <span
        style={{
          width: compact ? 28 : 34, height: compact ? 28 : 34, borderRadius: 9, flexShrink: 0,
          background: gelesen ? t.surface : t.surface, color: t.accent,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        <Megaphone size={compact ? 15 : 17} strokeWidth={1.8} />
      </span>

      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
          {!gelesen && (
            <span style={{ width: 7, height: 7, borderRadius: 999, background: t.accent, flexShrink: 0 }} />
          )}
          <span
            style={{
              flex: 1, minWidth: 0, fontSize: compact ? 13 : 14, fontWeight: gelesen ? 600 : 700,
              color: t.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}
          >
            {ank.titel}
          </span>
        </span>

        {ank.text && (
          <span
            style={{
              display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
              overflow: "hidden", fontSize: 12.5, color: t.textMuted,
              lineHeight: 1.5, marginTop: 3,
            }}
          >
            {ank.text}
          </span>
        )}

        <span style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap", marginTop: 6 }}>
          {ank.termin && (
            <Pill
              label={terminLabel(ank.termin, formatDatum)}
              color={t.accent}
              style={{ display: "inline-flex", alignItems: "center", gap: 5 }}
            />
          )}
          {ank.dateiName && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11.5, color: t.textMuted }}>
              <DateiIcon typ={ank.dateiTyp} size={13} />
              {ank.dateiName}
            </span>
          )}
          {ank.kursNamen?.length > 0 && (
            <Tag label={`Nur für: ${ank.kursNamen.join(", ")}`} bg={t.surface2} fg={t.textMuted} />
          )}
          <span style={{ fontSize: 11.5, color: t.textFaint, display: "inline-flex", alignItems: "center", gap: 4 }}>
            {ank.autor} · {relativeTime(ank.createdAt)}
            {ank.editedAt && <Pencil size={10} strokeWidth={2} />}
          </span>
        </span>
      </span>

      {ank.termin && !compact && (
        <CalendarClock size={15} strokeWidth={1.8} color={t.textFaint} style={{ flexShrink: 0, marginTop: 2 }} />
      )}
    </button>
  );
}
