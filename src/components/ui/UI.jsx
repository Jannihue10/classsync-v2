import { useEffect } from "react";
import { useTheme } from "../../context/ThemeContext";
import { radius } from "../../styles/theme";

// ---------- Button ----------
export function Btn({ variant = "primary", full, small, disabled, style, children, ...props }) {
  const { t } = useTheme();
  const variants = {
    primary: { background: t.accent, color: t.accentText, border: "1px solid transparent" },
    ghost: { background: "transparent", color: t.text, border: `1px solid ${t.borderStrong}` },
    soft: { background: t.surface2, color: t.text, border: `1px solid ${t.border}` },
    danger: { background: t.danger, color: "#fff", border: "1px solid transparent" },
    dangerGhost: { background: "transparent", color: t.danger, border: `1px solid ${t.danger}55` },
    success: { background: t.success, color: "#fff", border: "1px solid transparent" },
  };
  return (
    <button
      disabled={disabled}
      style={{
        ...variants[variant],
        width: full ? "100%" : undefined,
        padding: small ? "6px 12px" : "10px 18px",
        borderRadius: radius.sm,
        fontWeight: 600,
        fontSize: small ? 13 : 14,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.55 : 1,
        transition: "filter .15s, transform .05s",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 7,
        whiteSpace: "nowrap",
        ...style,
      }}
      onMouseEnter={(e) => !disabled && (e.currentTarget.style.filter = "brightness(0.94)")}
      onMouseLeave={(e) => (e.currentTarget.style.filter = "none")}
      {...props}
    >
      {children}
    </button>
  );
}

// ---------- IconButton ----------
export function IconButton({ title, active, badge, style, children, ...props }) {
  const { t } = useTheme();
  return (
    <button
      title={title}
      style={{
        position: "relative",
        background: active ? t.sidebarActive : "transparent",
        border: "none",
        borderRadius: radius.sm,
        width: 36,
        height: 36,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        color: t.textMuted,
        fontSize: 17,
        transition: "background .15s",
        ...style,
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = t.surfaceHover)}
      onMouseLeave={(e) => (e.currentTarget.style.background = active ? t.sidebarActive : "transparent")}
      {...props}
    >
      {children}
      {badge > 0 && (
        <span
          style={{
            position: "absolute",
            top: 2,
            right: 2,
            background: t.danger,
            color: "#fff",
            borderRadius: 999,
            fontSize: 10,
            fontWeight: 700,
            minWidth: 16,
            height: 16,
            padding: "0 4px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            lineHeight: 1,
          }}
        >
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </button>
  );
}

// ---------- Input ----------
export function Input({ label, error, textarea, style, inputRef, ...props }) {
  const { t } = useTheme();
  const base = {
    width: "100%",
    padding: "10px 12px",
    borderRadius: radius.sm,
    border: `1px solid ${error ? t.danger : t.borderStrong}`,
    background: t.surface,
    color: t.text,
    fontSize: 14,
    outline: "none",
    resize: textarea ? "vertical" : undefined,
    minHeight: textarea ? 80 : undefined,
    colorScheme: t.mode,
    ...style,
  };
  const El = textarea ? "textarea" : "input";
  return (
    <label style={{ display: "block", width: "100%" }}>
      {label && (
        <span style={{ display: "block", fontSize: 13, fontWeight: 600, color: t.textMuted, marginBottom: 6 }}>
          {label}
        </span>
      )}
      <El
        ref={inputRef}
        style={base}
        onFocus={(e) => (e.target.style.borderColor = t.accent)}
        onBlur={(e) => (e.target.style.borderColor = error ? t.danger : t.borderStrong)}
        {...props}
      />
      {error && <span style={{ display: "block", fontSize: 12, color: t.danger, marginTop: 5 }}>{error}</span>}
    </label>
  );
}

// ---------- Modal ----------
export function Modal({ width = 480, onClose, children, noPad }) {
  const { t } = useTheme();
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}
      style={{
        position: "fixed",
        inset: 0,
        background: t.overlay,
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        animation: "cs-fadein .15s ease",
      }}
    >
      <div
        style={{
          background: t.surface,
          borderRadius: radius.lg,
          border: `1px solid ${t.border}`,
          boxShadow: t.shadowLg,
          width: "100%",
          maxWidth: width,
          maxHeight: "92vh",
          overflowY: "auto",
          padding: noPad ? 0 : 24,
          animation: "cs-slideup .2s ease",
        }}
      >
        {children}
      </div>
    </div>
  );
}

export function ModalHeader({ title, subtitle, onClose }) {
  const { t } = useTheme();
  return (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 18 }}>
      <div>
        <h2 style={{ margin: 0, fontSize: 19, fontWeight: 700, color: t.text }}>{title}</h2>
        {subtitle && <p style={{ margin: "4px 0 0", fontSize: 13, color: t.textMuted }}>{subtitle}</p>}
      </div>
      {onClose && (
        <button
          onClick={onClose}
          aria-label="Schließen"
          style={{
            background: t.surface2,
            border: "none",
            borderRadius: radius.full,
            width: 30,
            height: 30,
            cursor: "pointer",
            color: t.textMuted,
            fontSize: 15,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          ✕
        </button>
      )}
    </div>
  );
}

// ---------- Pill / Tag ----------
export function Pill({ label, color, style }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "3px 10px",
        borderRadius: radius.full,
        background: `${color}22`,
        color,
        fontSize: 12,
        fontWeight: 700,
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {label}
    </span>
  );
}

export function Tag({ label, bg, fg, style }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "2px 8px",
        borderRadius: 6,
        background: bg,
        color: fg,
        fontSize: 11,
        fontWeight: 700,
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {label}
    </span>
  );
}

// ---------- Divider / SectionTitle ----------
export function Divider({ style }) {
  const { t } = useTheme();
  return <hr style={{ border: "none", borderTop: `1px solid ${t.border}`, margin: "18px 0", ...style }} />;
}

export function SectionTitle({ children, action, style }) {
  const { t } = useTheme();
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "0 0 12px", ...style }}>
      <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: t.text }}>{children}</h3>
      {action}
    </div>
  );
}

// ---------- Spinner ----------
export function Spinner({ size = 28, center }) {
  const { t } = useTheme();
  const el = (
    <div
      style={{
        width: size,
        height: size,
        border: `3px solid ${t.border}`,
        borderTopColor: t.accent,
        borderRadius: "50%",
        animation: "cs-spin .7s linear infinite",
      }}
    />
  );
  if (!center) return el;
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 48 }}>{el}</div>
  );
}

// ---------- Empty ----------
export function Empty({ icon = "📭", text, sub, action, style }) {
  const { t } = useTheme();
  return (
    <div style={{ textAlign: "center", padding: "42px 20px", color: t.textMuted, ...style }}>
      <div style={{ fontSize: 36, marginBottom: 10 }}>{icon}</div>
      <div style={{ fontSize: 15, fontWeight: 600, color: t.text }}>{text}</div>
      {sub && <div style={{ fontSize: 13, marginTop: 5 }}>{sub}</div>}
      {action && <div style={{ marginTop: 16, display: "flex", justifyContent: "center" }}>{action}</div>}
    </div>
  );
}

// ---------- Card ----------
export function Card({ style, children, onClick, hover }) {
  const { t } = useTheme();
  return (
    <div
      onClick={onClick}
      style={{
        background: t.surface,
        border: `1px solid ${t.border}`,
        borderRadius: radius.md,
        boxShadow: t.shadow,
        cursor: onClick ? "pointer" : undefined,
        transition: "border-color .15s, transform .1s",
        ...style,
      }}
      onMouseEnter={(e) => hover && (e.currentTarget.style.borderColor = t.borderStrong)}
      onMouseLeave={(e) => hover && (e.currentTarget.style.borderColor = t.border)}
    >
      {children}
    </div>
  );
}
