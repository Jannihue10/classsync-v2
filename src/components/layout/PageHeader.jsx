import { useTheme } from "../../context/ThemeContext";

export default function PageHeader({ icon, title, subtitle, action }) {
  const { t } = useTheme();
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18, flexWrap: "wrap" }}>
      <div style={{ flex: 1, minWidth: 200 }}>
        <h1 style={{ margin: 0, fontSize: 21, fontWeight: 800, color: t.text, letterSpacing: -0.4 }}>
          {icon} {title}
        </h1>
        {subtitle && <p style={{ margin: "3px 0 0", fontSize: 13, color: t.textMuted }}>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
