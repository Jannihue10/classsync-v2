import { useNavigate } from "react-router-dom";
import { Bell, Check, CheckCircle2 } from "lucide-react";
import { useNotifications } from "../../context/NotificationContext";
import { useTheme } from "../../context/ThemeContext";
import { MAT_COLORS } from "../../lib/faecher";
import { relativeTime } from "../../lib/dates";
import { radius } from "../../styles/theme";
import { Btn, CloseButton, Empty, Tag } from "../ui/UI";

// Slide-over von rechts: neue Materialien gruppiert nach Kurs
export default function NotificationPanel({ onClose }) {
  const { t } = useTheme();
  const { grouped, unreadCount, markAllRead } = useNotifications();
  const navigate = useNavigate();

  return (
    <div
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      style={{ position: "fixed", inset: 0, background: t.overlay, zIndex: 900, animation: "cs-fadein .15s ease" }}
    >
      <div
        style={{
          position: "absolute", top: 0, right: 0, bottom: 0, width: "min(380px, 100vw)",
          background: t.surface, borderLeft: `1px solid ${t.border}`, boxShadow: t.shadowLg,
          display: "flex", flexDirection: "column", animation: "cs-slidein-right .2s ease",
        }}
      >
        <div
          style={{
            padding: "16px 18px", borderBottom: `1px solid ${t.border}`,
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <Bell size={16} strokeWidth={1.8} color={t.textMuted} />
            <h2 style={{ margin: 0, fontSize: 15.5, fontWeight: 700, color: t.text }}>Neu für dich</h2>
            {unreadCount > 0 && (
              <span
                style={{
                  background: t.danger, color: "#fff", borderRadius: 999,
                  fontSize: 11, fontWeight: 700, padding: "1px 7px",
                }}
              >
                {unreadCount}
              </span>
            )}
          </div>
          <CloseButton onClick={onClose} style={{ width: 28, height: 28 }} />
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: 14 }}>
          {grouped.length === 0 ? (
            <Empty icon={CheckCircle2} text="Alles gelesen" sub="Neue Materialien deiner Kurse tauchen hier auf." />
          ) : (
            grouped.map((gruppe) => (
              <div key={gruppe.kursId} style={{ marginBottom: 18 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8, padding: "0 2px" }}>
                  <span style={{ width: 8, height: 8, borderRadius: 999, background: gruppe.farbe, flexShrink: 0 }} />
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: t.text }}>{gruppe.kursName}</span>
                </div>
                <div style={{ display: "grid", gap: 6 }}>
                  {gruppe.items.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => { navigate(`/kurs/${item.kursId}`); onClose(); }}
                      style={{
                        textAlign: "left", background: t.surface2, border: `1px solid ${t.border}`,
                        borderRadius: radius.sm, padding: "10px 12px", cursor: "pointer", display: "grid", gap: 5,
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = t.surfaceHover)}
                      onMouseLeave={(e) => (e.currentTarget.style.background = t.surface2)}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <Tag label={item.typ} bg={`${MAT_COLORS[item.typ]}1c`} fg={MAT_COLORS[item.typ]} />
                        <span style={{ fontSize: 11.5, color: t.textFaint }}>{relativeTime(item.createdAt)}</span>
                      </div>
                      <div style={{ fontSize: 13.5, fontWeight: 600, color: t.text }}>{item.titel}</div>
                      <div style={{ fontSize: 12, color: t.textMuted }}>von {item.autor}</div>
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {unreadCount > 0 && (
          <div style={{ padding: 14, borderTop: `1px solid ${t.border}` }}>
            <Btn full variant="soft" onClick={markAllRead}>
              <Check size={15} strokeWidth={2} /> Alle gelesen
            </Btn>
          </div>
        )}
      </div>
    </div>
  );
}
