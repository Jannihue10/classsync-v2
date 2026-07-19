import { useEffect, useState } from "react";
import { ArrowRightLeft, Check, Copy, Crown, GraduationCap, LogOut, Mail, Moon, Plus, Scaling, Settings2, Sun, Trash2, TriangleAlert, User, UserMinus } from "lucide-react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../context/AuthContext";
import { useKlasse } from "../context/KlasseContext";
import { useMemberships } from "../context/MembershipsContext";
import { useTheme } from "../context/ThemeContext";
import { acceptMigration, banFromKlasse, deleteKlasse, demoteAdmin, leaveKlasse, promoteAdmin, switchActiveKlasse, unbanFromKlasse } from "../lib/klasseActions";
import { PAGE_PAD, radius } from "../styles/theme";
import { Btn, Card, Divider, Input, SectionTitle, Spinner } from "../components/ui/UI";
import ConfirmDialog from "../components/modals/ConfirmDialog";
import ChangeEmailModal from "../components/modals/ChangeEmailModal";
import DeleteAccountModal from "../components/modals/DeleteAccountModal";
import MigrateKlasseModal from "../components/modals/MigrateKlasseModal";
import PageHeader from "../components/layout/PageHeader";

// Reihenfolge der UI-Größen-Auswahl (Werte in styles/theme.js: UI_SCALES)
const UI_SCALE_OPTIONS = [
  { key: "auto", label: "Automatisch" },
  { key: "klein", label: "Klein" },
  { key: "normal", label: "Normal" },
  { key: "gross", label: "Groß" },
];

export default function ProfilPage({ onOpenKurswahl, onOpenAddKlasse }) {
  const { t, toggle, mode, scalePref, setScalePref } = useTheme();
  const { profile, logout, updateProfile } = useAuth();
  const { klasse, kurse, isKlassenAdmin } = useKlasse();
  const { myClasses, openMigrations } = useMemberships();
  const [inviteBusy, setInviteBusy] = useState(null);

  const [nickname, setNickname] = useState(profile.nickname);
  const [nickBusy, setNickBusy] = useState(false);
  const [nickSaved, setNickSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [banTarget, setBanTarget] = useState(null);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [migrateOpen, setMigrateOpen] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [emailOpen, setEmailOpen] = useState(false);
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);

  // Klassenmitglieder live
  const [mitglieder, setMitglieder] = useState(null);
  useEffect(() => {
    const q = query(collection(db, "users"), where("klasseIds", "array-contains", klasse.id));
    return onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({ uid: d.id, ...d.data() }));
      list.sort((a, b) => a.nickname.localeCompare(b.nickname, "de"));
      setMitglieder(list);
    });
  }, [klasse.id]);

  async function handleNickname(e) {
    e.preventDefault();
    if (nickname.trim().length < 2 || nickname.trim() === profile.nickname) return;
    setNickBusy(true);
    try {
      await updateProfile({ nickname: nickname.trim() });
      setNickSaved(true);
      setTimeout(() => setNickSaved(false), 2000);
    } finally {
      setNickBusy(false);
    }
  }

  function copyCode() {
    navigator.clipboard?.writeText(klasse.code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    });
  }

  const adminIds = klasse.adminIds || [];
  const bannedIds = klasse.bannedIds || [];
  const bannedInfo = klasse.bannedInfo || {};
  const binIchAdmin = adminIds.includes(profile.uid);
  const letzterAdminIch = binIchAdmin && adminIds.length === 1;

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: `${PAGE_PAD}px ${PAGE_PAD}px 40px` }}>
      <PageHeader icon={User} title="Profil & Klasse" />

      <div style={{ display: "grid", gap: 16 }}>
        {/* Eigenes Profil */}
        <Card style={{ padding: 18 }}>
          <SectionTitle>Dein Profil</SectionTitle>
          <form onSubmit={handleNickname} style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <Input
                label="Nickname (für andere sichtbar)"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                maxLength={24}
              />
            </div>
            <Btn type="submit" small disabled={nickBusy || nickname.trim().length < 2 || nickname.trim() === profile.nickname}>
              {nickBusy ? "Speichern…" : nickSaved ? (
                <>
                  <Check size={14} strokeWidth={2} /> Gespeichert
                </>
              ) : "Speichern"}
            </Btn>
          </form>
          <div style={{ display: "flex", gap: 10, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", marginTop: 10 }}>
            <p style={{ margin: 0, fontSize: 12.5, color: t.textFaint }}>
              Angemeldet als {profile.email} – deine E-Mail ist für andere nie sichtbar.
            </p>
            <Btn small variant="soft" onClick={() => setEmailOpen(true)}>
              <Mail size={14} strokeWidth={1.8} /> E-Mail ändern
            </Btn>
          </div>
          <Divider />
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 12 }}>
            <span style={{ fontSize: 12.5, color: t.textMuted, display: "flex", alignItems: "center", gap: 7 }}>
              <Scaling size={14} strokeWidth={1.8} /> UI-Größe
            </span>
            {UI_SCALE_OPTIONS.map((opt) => (
              <Btn
                key={opt.key}
                small
                variant={scalePref === opt.key ? "primary" : "soft"}
                onClick={() => setScalePref(opt.key)}
              >
                {opt.label}
              </Btn>
            ))}
          </div>
          <p style={{ margin: "0 0 4px", fontSize: 12, color: t.textFaint }}>
            „Automatisch" vergrößert die Oberfläche nur auf Tablets.
          </p>
          <Divider />
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Btn small variant="soft" onClick={toggle}>
              {mode === "light" ? (
                <>
                  <Moon size={14} strokeWidth={1.8} /> Dark Mode
                </>
              ) : (
                <>
                  <Sun size={14} strokeWidth={1.8} /> Light Mode
                </>
              )}
            </Btn>
            <Btn small variant="ghost" onClick={logout}>Abmelden</Btn>
          </div>
        </Card>

        {/* Deine Klassen (Multi-Klassen-Wechsler) */}
        <Card style={{ padding: 18 }}>
          <SectionTitle
            action={
              <Btn small variant="soft" onClick={onOpenAddKlasse}>
                <Plus size={14} strokeWidth={2} /> Klasse hinzufügen
              </Btn>
            }
          >
            Deine Klassen
          </SectionTitle>
          <div style={{ display: "grid", gap: 6 }}>
            {myClasses.map((c) => {
              const aktiv = c.id === klasse.id;
              return (
                <div
                  key={c.id}
                  style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "8px 11px",
                    background: t.surface2, borderRadius: radius.sm,
                    border: `1px solid ${aktiv ? `${t.accent}66` : t.border}`,
                  }}
                >
                  <span
                    style={{
                      width: 30, height: 30, borderRadius: 8, background: t.accentSoft, color: t.accent,
                      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                    }}
                  >
                    <GraduationCap size={16} strokeWidth={1.8} />
                  </span>
                  <span style={{ flex: 1, minWidth: 0, fontSize: 13.5, fontWeight: 500, color: t.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {c.name}
                  </span>
                  {aktiv ? (
                    <span style={{ fontSize: 11, fontWeight: 700, color: t.accent, background: t.accentSoft, borderRadius: 999, padding: "2px 9px" }}>
                      Aktiv
                    </span>
                  ) : (
                    <Btn small variant="soft" onClick={() => switchActiveKlasse(profile.uid, c.id)}>
                      <ArrowRightLeft size={13} strokeWidth={1.8} /> Wechseln
                    </Btn>
                  )}
                </div>
              );
            })}
          </div>

          {/* Offene Migrations-Einladungen (auch nach „Später" hier annehmbar) */}
          {openMigrations.length > 0 && (
            <>
              <Divider />
              <div style={{ fontSize: 12.5, fontWeight: 700, color: t.textMuted, marginBottom: 8 }}>
                Offene Einladungen ({openMigrations.length})
              </div>
              <div style={{ display: "grid", gap: 6 }}>
                {openMigrations.map((p) => (
                  <div
                    key={p.migration.id}
                    style={{
                      display: "flex", alignItems: "center", gap: 10, padding: "8px 11px",
                      background: t.accentSoft, borderRadius: radius.sm, border: `1px solid ${t.accent}44`,
                    }}
                  >
                    <span style={{ width: 30, height: 30, borderRadius: 8, background: t.surface, color: t.accent, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <ArrowRightLeft size={15} strokeWidth={1.8} />
                    </span>
                    <span style={{ flex: 1, minWidth: 0, fontSize: 13, color: t.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      <b>{p.migration.targetName}</b> <span style={{ color: t.textMuted }}>(aus „{p.sourceName}")</span>
                    </span>
                    <Btn
                      small
                      disabled={inviteBusy === p.migration.id}
                      onClick={async () => {
                        setInviteBusy(p.migration.id);
                        try { await acceptMigration(profile.uid, p.migration); }
                        catch { setInviteBusy(null); }
                      }}
                    >
                      {inviteBusy === p.migration.id ? "Beitreten…" : "Beitreten"}
                    </Btn>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>

        {/* Klasse */}
        <Card style={{ padding: 18 }}>
          <SectionTitle
            action={
              <Btn small variant="soft" onClick={onOpenKurswahl}>
                <Settings2 size={14} strokeWidth={1.8} /> Kurse verwalten
              </Btn>
            }
          >
            Aktive Klasse
          </SectionTitle>
          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 180 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: t.text }}>{klasse.name}</div>
              <div style={{ fontSize: 12.5, color: t.textMuted, marginTop: 2 }}>
                {mitglieder?.length ?? "…"} Mitglieder
              </div>
            </div>
            <button
              onClick={copyCode}
              title="Code kopieren"
              style={{
                display: "flex", alignItems: "center", gap: 8, padding: "9px 14px",
                background: t.accentSoft, border: `1px dashed ${t.accent}66`, borderRadius: radius.sm,
                cursor: "pointer",
              }}
            >
              <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: 4, color: t.accent }}>
                {klasse.code}
              </span>
              <span style={{ fontSize: 11.5, fontWeight: 600, color: t.textMuted, display: "inline-flex", alignItems: "center", gap: 4 }}>
                {copied ? (
                  <>
                    <Check size={12} strokeWidth={2.2} /> Kopiert
                  </>
                ) : (
                  <>
                    <Copy size={12} strokeWidth={1.8} /> Kopieren
                  </>
                )}
              </span>
            </button>
          </div>
          <p style={{ margin: "10px 0 0", fontSize: 12.5, color: t.textFaint }}>
            Mit diesem Code können Mitschüler deiner Klasse beitreten.
          </p>
          <Divider />
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            {isKlassenAdmin && (
              <Btn small variant="soft" onClick={() => setMigrateOpen(true)}>
                <ArrowRightLeft size={13.5} strokeWidth={1.8} />
                {klasse.migration ? "Migration verwalten" : "Ins neue Schuljahr übernehmen"}
              </Btn>
            )}
            {letzterAdminIch ? (
              <p style={{ margin: 0, fontSize: 12.5, color: t.textFaint }}>
                Als letzter Admin kannst du die Klasse nicht verlassen – übertrage zuerst die Admin-Rolle
                oder lösche die Klasse.
              </p>
            ) : (
              <Btn small variant="dangerGhost" onClick={() => setLeaveOpen(true)}>
                <LogOut size={13.5} strokeWidth={1.8} /> Klasse verlassen
              </Btn>
            )}
          </div>
        </Card>

        {/* Mitglieder */}
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
                return (
                  <div
                    key={m.uid}
                    style={{
                      display: "flex", alignItems: "center", gap: 10, padding: "8px 11px",
                      background: t.surface2, borderRadius: radius.sm, border: `1px solid ${t.border}`,
                      opacity: istGebannt ? 0.5 : 1,
                    }}
                  >
                    <span
                      style={{
                        width: 30, height: 30, borderRadius: 999,
                        background: istGebannt ? t.dangerSoft : istAdmin ? t.warningSoft : t.accentSoft,
                        color: istGebannt ? t.danger : istAdmin ? t.warning : t.accent,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 13, fontWeight: 700, flexShrink: 0,
                      }}
                    >
                      {m.nickname?.[0]?.toUpperCase() || "?"}
                    </span>
                    <span style={{ flex: 1, minWidth: 0, fontSize: 13.5, fontWeight: 500, color: t.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textDecoration: istGebannt ? "line-through" : "none" }}>
                      {m.nickname} {istIch && <span style={{ color: t.textFaint }}>(du)</span>}
                    </span>
                    {istGebannt ? (
                      <span style={{ fontSize: 11, fontWeight: 700, color: t.danger, background: t.dangerSoft, borderRadius: 999, padding: "2px 9px" }}>
                        Gesperrt
                      </span>
                    ) : (
                      <>
                        {istAdmin && (
                          <span style={{ fontSize: 11, fontWeight: 700, color: t.warning, background: t.warningSoft, borderRadius: 999, padding: "2px 9px", display: "inline-flex", alignItems: "center", gap: 4 }}>
                            <Crown size={11} strokeWidth={1.8} /> Admin
                          </span>
                        )}
                        {isKlassenAdmin && !istAdmin && (
                          <Btn small variant="soft" onClick={() => promoteAdmin(klasse.id, m.uid)}>
                            <Crown size={13} strokeWidth={1.8} /> Zum Admin
                          </Btn>
                        )}
                        {isKlassenAdmin && !istAdmin && !istIch && (
                          <Btn small variant="dangerGhost" onClick={() => setBanTarget(m)}>
                            <UserMinus size={13} strokeWidth={1.8} /> Entfernen
                          </Btn>
                        )}
                        {isKlassenAdmin && istAdmin && !letzterAdmin && (
                          <Btn small variant="ghost" onClick={() => demoteAdmin(klasse.id, m.uid)}>
                            Admin entfernen
                          </Btn>
                        )}
                        {isKlassenAdmin && letzterAdmin && (
                          <span style={{ fontSize: 11, color: t.textFaint }} title="Der letzte Admin kann nicht entfernt werden">
                            letzter Admin
                          </span>
                        )}
                      </>
                    )}
                  </div>
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
                  <div
                    key={uid}
                    style={{
                      display: "flex", alignItems: "center", gap: 10, padding: "8px 11px",
                      background: t.surface2, borderRadius: radius.sm, border: `1px solid ${t.border}`,
                    }}
                  >
                    <span
                      style={{
                        width: 30, height: 30, borderRadius: 999, background: t.dangerSoft, color: t.danger,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 13, fontWeight: 700, flexShrink: 0,
                      }}
                    >
                      {bannedInfo[uid]?.[0]?.toUpperCase() || "?"}
                    </span>
                    <span style={{ flex: 1, minWidth: 0, fontSize: 13.5, fontWeight: 500, color: t.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {bannedInfo[uid] || "Unbekannt"}
                    </span>
                    <Btn small variant="soft" onClick={() => unbanFromKlasse(klasse.id, uid)}>
                      Entsperren
                    </Btn>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>

        {/* Gefahrenzone */}
        {isKlassenAdmin && (
          <Card style={{ padding: 18, borderColor: `${t.danger}44` }}>
            <SectionTitle>
              <TriangleAlert size={15} strokeWidth={1.8} color={t.danger} /> Gefahrenzone
            </SectionTitle>
            <p style={{ margin: "0 0 12px", fontSize: 13, color: t.textMuted, lineHeight: 1.55 }}>
              Löscht die Klasse mit allen Kursen, Materialien, Hausaufgaben, Prüfungen und Chats – endgültig.
              Alle Mitglieder landen wieder im Onboarding.
            </p>
            <Btn small variant="dangerGhost" onClick={() => { setDeleteError(""); setDeleteOpen(true); }}>
              <Trash2 size={13.5} strokeWidth={1.8} /> Klasse löschen
            </Btn>
            {deleteError && (
              <p style={{ margin: "12px 0 0", fontSize: 12.5, color: t.danger, lineHeight: 1.5, wordBreak: "break-word" }}>
                Löschen fehlgeschlagen: {deleteError}
              </p>
            )}
          </Card>
        )}

        {/* Konto-Gefahrenzone (für alle sichtbar) */}
        <Card style={{ padding: 18, borderColor: `${t.danger}44` }}>
          <SectionTitle>
            <TriangleAlert size={15} strokeWidth={1.8} color={t.danger} /> Account löschen
          </SectionTitle>
          <p style={{ margin: "0 0 12px", fontSize: 13, color: t.textMuted, lineHeight: 1.55 }}>
            Löscht dein ClassSync-Konto endgültig und entfernt dich aus allen Klassen und Kursen.
            Bereits geteilte Inhalte bleiben mit deinem Nickname erhalten. Bist du letzter Admin einer
            Klasse, musst du zuerst die Rolle übertragen oder die Klasse löschen.
          </p>
          <Btn small variant="dangerGhost" onClick={() => setDeleteAccountOpen(true)}>
            <Trash2 size={13.5} strokeWidth={1.8} /> Account löschen
          </Btn>
        </Card>
      </div>

      {deleteOpen && (
        <ConfirmDialog
          title="Klasse endgültig löschen?"
          text={`„${klasse.name}" wird mit allen Kursen und Inhalten unwiderruflich gelöscht. Alle ${mitglieder?.length ?? ""} Mitglieder verlieren den Zugriff.`}
          confirmLabel="Ja, alles löschen"
          onConfirm={async () => {
            try {
              await deleteKlasse(klasse.id);
            } catch (e) {
              // Fehler sichtbar machen (ConfirmDialog schluckt ihn sonst): Code + Meldung
              console.error("Klasse löschen fehlgeschlagen:", e);
              setDeleteError(e?.code ? `${e.code} — ${e.message}` : (e?.message || String(e)));
            }
          }}
          onClose={() => setDeleteOpen(false)}
        />
      )}

      {banTarget && (
        <ConfirmDialog
          title={`${banTarget.nickname} entfernen?`}
          text={`${banTarget.nickname} wird aus der Klasse und allen Kursen entfernt und kann mit dem Code nicht wieder beitreten, bis du die Sperre aufhebst.`}
          confirmLabel="Entfernen & sperren"
          onConfirm={() => banFromKlasse(klasse.id, banTarget, kurse)}
          onClose={() => setBanTarget(null)}
        />
      )}

      {leaveOpen && (
        <ConfirmDialog
          title="Klasse verlassen?"
          text={`Du verlässt „${klasse.name}" und wirst aus all deinen Kursen entfernt. Du kannst später mit dem Code wieder beitreten.`}
          confirmLabel="Klasse verlassen"
          onConfirm={() => leaveKlasse(klasse.id, profile.uid, kurse, binIchAdmin, profile.klasseIds || [], profile.activeKlasseId)}
          onClose={() => setLeaveOpen(false)}
        />
      )}

      {migrateOpen && (
        <MigrateKlasseModal
          klasse={klasse}
          mitglieder={mitglieder}
          myClasses={myClasses}
          onClose={() => setMigrateOpen(false)}
        />
      )}

      {emailOpen && <ChangeEmailModal onClose={() => setEmailOpen(false)} />}

      {deleteAccountOpen && (
        <DeleteAccountModal myClasses={myClasses} onClose={() => setDeleteAccountOpen(false)} />
      )}
    </div>
  );
}
