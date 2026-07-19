import { Moon, Sun } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import { radius, vhScaled } from "../../styles/theme";
import { LogoMark } from "../ui/UI";

// Zentrierte Karte für Login/Register/Onboarding
export default function AuthLayout({ title, subtitle, width = 400, children }) {
  const { t, toggle, mode } = useTheme();
  return (
    <div
      style={{
        minHeight: vhScaled(100),
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
          position: "fixed",
          top: "calc(14px + env(safe-area-inset-top))",
          right: "calc(14px + env(safe-area-inset-right))",
          background: t.surface,
          border: `1px solid ${t.border}`, borderRadius: radius.full,
          width: 38, height: 38, cursor: "pointer", color: t.textMuted,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        {mode === "light" ? <Moon size={16} strokeWidth={1.8} /> : <Sun size={16} strokeWidth={1.8} />}
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
          <h1 style={{ margin: "0 0 4px", fontSize: 20, fontWeight: 700, color: t.text, letterSpacing: -0.3 }}>{title}</h1>
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
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 26, ...style }}>
      <LogoMark size={size + 10} />
      <span style={{ fontSize: size - 5, fontWeight: 700, color: t.text, letterSpacing: -0.4 }}>
        ClassSync
      </span>
    </div>
  );
}
