import { useEffect, useRef, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { Bell, Calendar, Check, ChevronDown, LayoutGrid, Library, Moon, Plus, Settings2, Sun } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useKlasse } from "../../context/KlasseContext";
import { useMemberships } from "../../context/MembershipsContext";
import { useNotifications } from "../../context/NotificationContext";
import { useTheme } from "../../context/ThemeContext";
import { switchActiveKlasse } from "../../lib/klasseActions";
import { SIDEBAR_WIDTH, radius } from "../../styles/theme";
import { IconButton, LogoMark } from "../ui/UI";
import CourseAvatar from "../ui/CourseAvatar";

export default function Sidebar({ onNavigate, onOpenKursForm, onOpenKurswahl, onOpenNotifications, onOpenAddKlasse }) {
  const { t, toggle, mode } = useTheme();
  const { profile } = useAuth();
  const { klasse, meineKurse } = useKlasse();
  const { myClasses } = useMemberships();
  const { unreadCount } = useNotifications();
  const navigate = useNavigate();

  const [switcherOpen, setSwitcherOpen] = useState(false);
  const switcherRef = useRef(null);

  // Dropdown bei Außenklick/Escape schließen
  useEffect(() => {
    if (!switcherOpen) return;
    const onDoc = (e) => { if (!switcherRef.current?.contains(e.target)) setSwitcherOpen(false); };
    const onKey = (e) => { if (e.key === "Escape") setSwitcherOpen(false); };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDoc); document.removeEventListener("keydown", onKey); };
  }, [switcherOpen]);

  function pickKlasse(id) {
    setSwitcherOpen(false);
    if (id !== klasse?.id) switchActiveKlasse(profile.uid, id);
  }

  const navItemStyle = ({ isActive }) => ({
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "8px 12px",
    borderRadius: radius.sm,
    textDecoration: "none",
    fontSize: 13.5,
    fontWeight: isActive ? 600 : 500,
    color: isActive ? t.text : t.textMuted,
    background: isActive ? t.sidebarActive : "transparent",
    transition: "background .12s",
  });

  return (
    <aside
      style={{
        width: SIDEBAR_WIDTH,
        height: "100%",
        background: t.sidebarBg,
        borderRight: `1px solid ${t.border}`,
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
        // Safe-Area: Statusleiste oben, Home-Indikator unten, Notch links (Querformat)
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
        paddingLeft: "env(safe-area-inset-left)",
      }}
    >
      {/* Kopf: Logo + Klassen-Wechsler */}
      <div ref={switcherRef} style={{ padding: "18px 16px 12px", position: "relative" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <LogoMark size={32} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: t.text, letterSpacing: -0.3 }}>ClassSync</div>
            <button
              onClick={() => setSwitcherOpen((o) => !o)}
              title="Klasse wechseln"
              style={{
                display: "flex", alignItems: "center", gap: 4, width: "100%",
                background: "transparent", border: "none", padding: 0, marginTop: 1,
                cursor: "pointer", color: t.textMuted,
              }}
            >
              <span style={{ fontSize: 11.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 150 }}>
                {klasse?.name}
              </span>
              <ChevronDown size={13} strokeWidth={1.8} style={{ flexShrink: 0, transform: switcherOpen ? "rotate(180deg)" : "none", transition: "transform .12s" }} />
            </button>
          </div>
        </div>

        {switcherOpen && (
          <div
            style={{
              position: "absolute", top: "100%", left: 12, right: 12, zIndex: 900,
              background: t.surface, border: `1px solid ${t.border}`, borderRadius: radius.md,
              boxShadow: t.shadowLg || t.shadow, padding: 6, marginTop: 2,
              maxHeight: 320, overflowY: "auto",
            }}
          >
            <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 0.6, color: t.textFaint, textTransform: "uppercase", padding: "4px 8px 6px" }}>
              Deine Klassen
            </div>
            <div style={{ display: "grid", gap: 2 }}>
              {myClasses.map((c) => {
                const aktiv = c.id === klasse?.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => pickKlasse(c.id)}
                    style={{
                      display: "flex", alignItems: "center", gap: 8, width: "100%", textAlign: "left",
                      padding: "8px 8px", borderRadius: radius.sm, border: "none", cursor: "pointer",
                      background: aktiv ? t.sidebarActive : "transparent", color: t.text, fontSize: 13, fontWeight: aktiv ? 600 : 500,
                    }}
                    onMouseEnter={(e) => { if (!aktiv) e.currentTarget.style.background = t.surfaceHover; }}
                    onMouseLeave={(e) => { if (!aktiv) e.currentTarget.style.background = "transparent"; }}
                  >
                    <span style={{ flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {c.name}
                    </span>
                    {aktiv && <Check size={15} strokeWidth={2} color={t.accent} style={{ flexShrink: 0 }} />}
                  </button>
                );
              })}
            </div>
            <div style={{ height: 1, background: t.border, margin: "6px 4px" }} />
            <button
              onClick={() => { setSwitcherOpen(false); onOpenAddKlasse?.(); }}
              style={{
                display: "flex", alignItems: "center", gap: 8, width: "100%", textAlign: "left",
                padding: "8px 8px", borderRadius: radius.sm, border: "none", cursor: "pointer",
                background: "transparent", color: t.textMuted, fontSize: 13, fontWeight: 500,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = t.surfaceHover)}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <Plus size={15} strokeWidth={2} /> Klasse hinzufügen
            </button>
          </div>
        )}
      </div>

      {/* Haupt-Navigation */}
      <nav style={{ padding: "4px 10px", display: "grid", gap: 2 }}>
        <NavLink to="/" end style={navItemStyle} onClick={onNavigate}>
          <LayoutGrid size={16} strokeWidth={1.8} /> Übersicht
        </NavLink>
        <NavLink to="/bibliothek" style={navItemStyle} onClick={onNavigate}>
          <Library size={16} strokeWidth={1.8} /> Bibliothek
        </NavLink>
        <NavLink to="/kalender" style={navItemStyle} onClick={onNavigate}>
          <Calendar size={16} strokeWidth={1.8} /> Kalender
        </NavLink>
      </nav>

      {/* Kursliste */}
      <div style={{ flex: 1, overflowY: "auto", padding: "14px 10px 8px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 8px", marginBottom: 6 }}>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.8, color: t.textFaint, textTransform: "uppercase" }}>
            Meine Kurse
          </span>
          <button
            onClick={onOpenKursForm}
            title="Kurs erstellen"
            style={{
              background: "transparent", border: "none", cursor: "pointer",
              color: t.textMuted, width: 24, height: 24,
              borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = t.surfaceHover)}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <Plus size={15} strokeWidth={2} />
          </button>
        </div>

        <div style={{ display: "grid", gap: 2 }}>
          {meineKurse.length === 0 && (
            <div style={{ padding: "8px 8px", fontSize: 12.5, color: t.textFaint, lineHeight: 1.5 }}>
              {'Noch keine Kurse. Erstelle einen mit „+" oder wähle unten „Kurse verwalten".'}
            </div>
          )}
          {meineKurse.map((kurs) => (
            <NavLink key={kurs.id} to={`/kurs/${kurs.id}`} style={navItemStyle} onClick={onNavigate}>
              <CourseAvatar name={kurs.name} farbe={kurs.farbe} size={26} radius={7} />
              <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {kurs.name}
              </span>
            </NavLink>
          ))}
        </div>

        <button
          onClick={onOpenKurswahl}
          style={{
            marginTop: 8, width: "100%", padding: "7px 12px", borderRadius: radius.sm,
            background: "transparent", border: `1px dashed ${t.borderStrong}`,
            color: t.textMuted, fontSize: 12.5, fontWeight: 500, cursor: "pointer",
            display: "flex", alignItems: "center", gap: 7, justifyContent: "center",
          }}
        >
          <Settings2 size={14} strokeWidth={1.8} /> Kurse verwalten
        </button>
      </div>

      {/* Fuß: Profil + Glocke + Theme */}
      <div
        style={{
          borderTop: `1px solid ${t.border}`, padding: "10px 12px",
          display: "flex", alignItems: "center", gap: 6,
        }}
      >
        <button
          onClick={() => { navigate("/profil"); onNavigate?.(); }}
          title="Profil"
          style={{
            flex: 1, display: "flex", alignItems: "center", gap: 9, background: "transparent",
            border: "none", cursor: "pointer", padding: "6px 6px", borderRadius: radius.sm, minWidth: 0,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = t.surfaceHover)}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >
          <span
            style={{
              width: 28, height: 28, borderRadius: 999, background: t.accentSoft, color: t.accent,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 12.5, fontWeight: 700, flexShrink: 0,
            }}
          >
            {(profile?.nickname || "?")[0]?.toUpperCase()}
          </span>
          <span
            style={{
              fontSize: 13, fontWeight: 500, color: t.text,
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            }}
          >
            {profile?.nickname}
          </span>
        </button>
        <IconButton title="Benachrichtigungen" badge={unreadCount} onClick={onOpenNotifications}>
          <Bell size={17} strokeWidth={1.8} />
        </IconButton>
        <IconButton title="Design wechseln" onClick={toggle}>
          {mode === "light" ? <Moon size={17} strokeWidth={1.8} /> : <Sun size={17} strokeWidth={1.8} />}
        </IconButton>
      </div>
    </aside>
  );
}
