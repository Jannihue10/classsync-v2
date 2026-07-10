import { useTheme } from "../../context/ThemeContext";
import { radius } from "../../styles/theme";

// Zentrierte Karte für Login/Register/Onboarding
export default function AuthLayout({ title, subtitle, width = 400, children }) {
  const { t, toggle, mode } = useTheme();
  return (
    <div
      style={{
        minHeight: "100vh",
        background: t.bg,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <button
        onClick={toggle}
        title="Design wechseln"
        style={{
          position: "fixed", top: 14, right: 14, background: t.surface,
          border: `1px solid ${t.border}`, borderRadius: radius.full,
          width: 38, height: 38, cursor: "pointer", fontSize: 16,
        }}
      >
        {mode === "light" ? "🌙" : "☀️"}
      </button>

      <Logo />

      <div
        style={{
          width: "100%",
          maxWidth: width,
          background: t.surface,
          border: `1px solid ${t.border}`,
          borderRadius: radius.lg,
          boxShadow: t.shadow,
          padding: "28px 26px",
          animation: "cs-slideup .25s ease",
        }}
      >
        {title && (
          <h1 style={{ margin: "0 0 4px", fontSize: 21, fontWeight: 800, color: t.text }}>{title}</h1>
        )}
        {subtitle && (
          <p style={{ margin: "0 0 20px", fontSize: 13.5, color: t.textMuted }}>{subtitle}</p>
        )}
        {children}
      </div>
    </div>
  );
}

export function Logo({ size = 26, style }) {
  const { t } = useTheme();
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 26, ...style }}>
      <div
        style={{
          width: size + 10, height: size + 10, borderRadius: 10,
          background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: size - 6, boxShadow: "0 4px 14px rgba(99,102,241,.35)",
        }}
      >
        🎒
      </div>
      <span style={{ fontSize: size - 4, fontWeight: 800, color: t.text, letterSpacing: -0.5 }}>
        ClassSync
      </span>
    </div>
  );
}
