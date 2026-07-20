import { useTheme } from "../../context/ThemeContext";

// Einheitliche Einstellungszeile: Label (+ Hinweis) links, Control rechts.
// Ersetzt die frueher ueber die Karte verstreuten Buttons unter Dividern.
export default function SettingRow({ icon: Icon, label, hint, children, first }) {
  const { t } = useTheme();
  return (
    <div
      style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        gap: 12, flexWrap: "wrap",
        padding: "13px 0",
        borderTop: first ? "none" : `1px solid ${t.border}`,
      }}
    >
      <div style={{ minWidth: 160, flex: "1 1 200px" }}>
        <div style={{ fontSize: 13.5, fontWeight: 500, color: t.text, display: "flex", alignItems: "center", gap: 7 }}>
          {Icon && <Icon size={15} strokeWidth={1.8} color={t.textMuted} />}
          {label}
        </div>
        {hint && (
          <div style={{ fontSize: 12, color: t.textFaint, marginTop: 3, lineHeight: 1.45 }}>{hint}</div>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>{children}</div>
    </div>
  );
}

// Segmentierte Auswahl (Design, UI-Groesse) – optisch eine Einheit.
export function SegmentedControl({ options, value, onChange }) {
  const { t } = useTheme();
  return (
    <div style={{ display: "inline-flex", background: t.surface2, border: `1px solid ${t.border}`, borderRadius: 8, padding: 2 }}>
      {options.map((opt) => {
        const on = opt.key === value;
        return (
          <button
            key={opt.key}
            onClick={() => !on && onChange(opt.key)}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "5px 11px", borderRadius: 6, border: "none",
              background: on ? t.surface : "transparent",
              boxShadow: on ? t.shadow : "none",
              color: on ? t.text : t.textMuted,
              fontSize: 12.5, fontWeight: 600, cursor: on ? "default" : "pointer",
              whiteSpace: "nowrap",
            }}
          >
            {opt.icon && <opt.icon size={13.5} strokeWidth={1.8} />}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
