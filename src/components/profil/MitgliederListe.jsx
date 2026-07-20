import { useEffect, useState } from "react";
import { Crown, MoreVertical, ShieldOff, UserMinus } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useKlasse } from "../../context/KlasseContext";
import { useTheme } from "../../context/ThemeContext";
import { demoteAdmin, promoteAdmin, unbanFromKlasse } from "../../lib/klasseActions";
import { radius } from "../../styles/theme";
import { Btn, Card, Divider, SectionTitle, Spinner } from "../ui/UI";

export default function MitgliederListe({ mitglieder, onBan, onSelfDemote }) {
  const { t } = useTheme();
  const { profile } = useAuth();
  const { klasse, isKlassenAdmin } = useKlasse();
  const [menuFor, setMenuFor] = useState(null);

  const adminIds = klasse.adminIds || [];
  const bannedIds = klasse.bannedIds || [];
  const bannedInfo = klasse.bannedInfo || {};

  // Menü bei Klick außerhalb / Escape schließen (Muster wie im ChatPanel)
  useEffect(() => {
    if (!menuFor) return;
    const close = () => setMenuFor(null);
    const onKey = (e) => e.key === "Escape" && setMenuFor(null);
    document.addEventListener("click", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuFor]);

  return (
    <Card style={{ padding: 18 }}>
      <SectionTitle>Klassenmitglieder</SectionTitle>
      {!mitglieder ? (
        <Spinner center />
      ) : (
        <div style={{ display: "grid", gap: 6 }}>
          {mitglieder.map((m) => {
            const istGebannt = bannedIds.includes(m.uid);
            const istAdmin = adminIds.includes(m.uid);
            const istIch = m.uid === profile.uid;
            const letzterAdmin = istAdmin && adminIds.length === 1;

            // Genau die bisherigen Aktionen/Bedingungen – nur gebündelt
            const actions = [];
            if (isKlassenAdmin && !istGebannt) {
              if (!istAdmin) {
                actions.push({ key: "promote", icon: Crown, label: "Zum Admin", onClick: () => promoteAdmin(klasse.id, m.uid) });
              }
              // Sich selbst zu degradieren ist nicht selbst umkehrbar -> Rückfrage (Dialog in der ProfilPage)
              if (istAdmin && !letzterAdmin) {
                actions.push({
                  key: "demote", icon: ShieldOff, label: "Admin entfernen",
                  onClick: istIch ? onSelfDemote : () => demoteAdmin(klasse.id, m.uid),
                });
              }
              if (!istAdmin && !istIch) {
                actions.push({ key: "ban", icon: UserMinus, label: "Entfernen & sperren", danger: true, onClick: () => onBan(m) });
              }
            }

            return (
              <Row
                key={m.uid}
                t={t}
                initial={m.nickname?.[0]?.toUpperCase() || "?"}
                avatarBg={istGebannt ? t.dangerSoft : istAdmin ? t.warningSoft : t.accentSoft}
                avatarFg={istGebannt ? t.danger : istAdmin ? t.warning : t.accent}
                name={m.nickname}
                self={istIch}
                muted={istGebannt}
                strike={istGebannt}
                badge={
                  istGebannt ? (
                    <Badge t={t} bg={t.dangerSoft} fg={t.danger}>Gesperrt</Badge>
                  ) : istAdmin ? (
                    <Badge t={t} bg={t.warningSoft} fg={t.warning}>
                      <Crown size={11} strokeWidth={1.8} /> Admin
                    </Badge>
                  ) : null
                }
                trailing={
                  isKlassenAdmin && !istGebannt && letzterAdmin && actions.length === 0 ? (
                    <span style={{ fontSize: 11, color: t.textFaint }} title="Der letzte Admin kann nicht entfernt werden">
                      letzter Admin
                    </span>
                  ) : actions.length > 0 ? (
                    <OverflowMenu
                      t={t}
                      open={menuFor === m.uid}
                      onToggle={(e) => { e.stopPropagation(); setMenuFor(menuFor === m.uid ? null : m.uid); }}
                      actions={actions}
                      onPick={() => setMenuFor(null)}
                    />
                  ) : null
                }
              />
            );
          })}
        </div>
      )}

      {isKlassenAdmin && bannedIds.length > 0 && (
        <>
          <Divider />
          <div style={{ fontSize: 12.5, fontWeight: 700, color: t.textMuted, marginBottom: 8 }}>
            Gesperrt ({bannedIds.length})
          </div>
          <div style={{ display: "grid", gap: 6 }}>
            {bannedIds.map((uid) => (
              <Row
                key={uid}
                t={t}
                initial={bannedInfo[uid]?.[0]?.toUpperCase() || "?"}
                avatarBg={t.dangerSoft}
                avatarFg={t.danger}
                name={bannedInfo[uid] || "Unbekannt"}
                muted
                trailing={
                  <Btn small variant="soft" onClick={() => unbanFromKlasse(klasse.id, uid)}>
                    Entsperren
                  </Btn>
                }
              />
            ))}
          </div>
        </>
      )}
    </Card>
  );
}

// ---------- Bausteine ----------

function Row({ t, initial, avatarBg, avatarFg, name, self, muted, strike, badge, trailing }) {
  return (
    <div
      style={{
        position: "relative",
        display: "flex", alignItems: "center", gap: 10, padding: "8px 11px",
        background: t.surface2, borderRadius: radius.sm, border: `1px solid ${t.border}`,
        opacity: muted ? 0.6 : 1,
      }}
    >
      <span
        style={{
          width: 30, height: 30, borderRadius: 999, background: avatarBg, color: avatarFg,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 13, fontWeight: 700, flexShrink: 0,
        }}
      >
        {initial}
      </span>
      <span
        style={{
          flex: 1, minWidth: 0, fontSize: 13.5, fontWeight: 500,
          color: muted ? t.textMuted : t.text,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          textDecoration: strike ? "line-through" : "none",
        }}
      >
        {name} {self && <span style={{ color: t.textFaint }}>(du)</span>}
      </span>
      {badge}
      {trailing}
    </div>
  );
}

function Badge({ t, bg, fg, children }) {
  return (
    <span
      style={{
        fontSize: 11, fontWeight: 700, color: fg, background: bg, borderRadius: 999,
        padding: "2px 9px", display: "inline-flex", alignItems: "center", gap: 4, flexShrink: 0,
      }}
    >
      {children}
    </span>
  );
}

function OverflowMenu({ t, open, onToggle, actions, onPick }) {
  return (
    <>
      <button
        onClick={onToggle}
        aria-label="Aktionen"
        style={{
          background: open ? t.surfaceHover : "transparent", border: "none", borderRadius: radius.sm,
          width: 28, height: 28, cursor: "pointer", color: t.textMuted, flexShrink: 0,
          display: "inline-flex", alignItems: "center", justifyContent: "center",
        }}
      >
        <MoreVertical size={16} strokeWidth={1.8} />
      </button>
      {open && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: "absolute", top: "100%", right: 6, marginTop: 4, zIndex: 5,
            background: t.surface, border: `1px solid ${t.border}`,
            borderRadius: radius.md, boxShadow: t.shadowLg,
            padding: 4, display: "flex", flexDirection: "column", minWidth: 176,
          }}
        >
          {actions.map((a) => (
            <button
              key={a.key}
              type="button"
              onClick={() => { onPick(); a.onClick(); }}
              style={{
                display: "flex", alignItems: "center", gap: 9,
                padding: "8px 10px", borderRadius: radius.sm,
                border: "none", background: "transparent",
                color: a.danger ? t.danger : t.text, fontSize: 13, fontWeight: 500,
                cursor: "pointer", textAlign: "left", width: "100%",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = a.danger ? t.dangerSoft : t.surfaceHover)}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <a.icon size={15} strokeWidth={1.8} />
              {a.label}
            </button>
          ))}
        </div>
      )}
    </>
  );
}
