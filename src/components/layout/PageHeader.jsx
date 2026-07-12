import { useTheme } from "../../context/ThemeContext";

// Seitenkopf. icon: Lucide-Komponente (optional)
export default function PageHeader({ icon: Icon, title, subtitle, action }) {
  const { t } = useTheme();
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18, flexWrap: "wrap" }}>
      <div style={{ flex: 1, minWidth: 200 }}>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: t.text, letterSpacing: -0.3, display: "flex", alignItems: "center", gap: 9 }}>
          {Icon && <Icon size={19} strokeWidth={1.8} color={t.textMuted} />}
          {title}
        </h1>
        {subtitle && <p style={{ margin: "3px 0 0", fontSize: 13, color: t.textMuted }}>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
