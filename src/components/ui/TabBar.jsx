import { useTheme } from "../../context/ThemeContext";
import { radius } from "../../styles/theme";

// Pill-Tabs. tabs: [{ id, label, icon, badge }]
// badgeTone: "danger" = etwas liegt an (offene HAs/Pruefungen im Kurs),
//            "neutral" = reine Anzahl (offene Einladungen im Profil).
export default function TabBar({ tabs, active, onChange, badgeTone = "neutral", style }) {
  const { t } = useTheme();
  const danger = badgeTone === "danger";
  return (
    <div style={{ display: "flex", gap: 6, marginBottom: 16, overflowX: "auto", paddingBottom: 2, ...style }}>
      {tabs.map((tab) => {
        const on = tab.id === active;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            style={{
              padding: "8px 14px", borderRadius: radius.full, whiteSpace: "nowrap",
              border: `1px solid ${on ? "transparent" : t.border}`,
              background: on ? t.accent : t.surface,
              color: on ? t.accentText : t.textMuted,
              fontSize: 13, fontWeight: 600, cursor: "pointer",
              display: "flex", alignItems: "center", gap: 7,
            }}
          >
            {tab.icon && <tab.icon size={14} strokeWidth={1.8} />}
            {tab.label}
            {tab.badge > 0 && (
              <span
                style={{
                  background: on ? "rgba(255,255,255,.25)" : danger ? t.dangerSoft : t.surface2,
                  color: on ? t.accentText : danger ? t.danger : t.textMuted,
                  borderRadius: 999, fontSize: 11, fontWeight: 700, padding: "1px 7px",
                }}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
