import { useEffect, useState } from "react";
import { Check, Copy, Crown, Moon, Settings2, Sun, Trash2, TriangleAlert, User } from "lucide-react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../context/AuthContext";
import { useKlasse } from "../context/KlasseContext";
import { useTheme } from "../context/ThemeContext";
import { deleteKlasse, demoteAdmin, promoteAdmin } from "../lib/klasseActions";
import { radius } from "../styles/theme";
import { Btn, Card, Divider, Input, SectionTitle, Spinner } from "../components/ui/UI";
import ConfirmDialog from "../components/modals/ConfirmDialog";
import PageHeader from "../components/layout/PageHeader";

export default function ProfilPage({ onOpenKurswahl }) {
  const { t, toggle, mode } = useTheme();
  const { profile, logout, updateProfile } = useAuth();
  const { klasse, isKlassenAdmin } = useKlasse();

  const [nickname, setNickname] = useState(profile.nickname);
  const [nickBusy, setNickBusy] = useState(false);
  const [nickSaved, setNickSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  // Klassenmitglieder live
  const [mitglieder, setMitglieder] = useState(null);
  useEffect(() => {
    const q = query(collection(db, "users"), where("klasseId", "==", klasse.id));
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

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "20px 20px 40px" }}>
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
          <p style={{ margin: "10px 0 0", fontSize: 12.5, color: t.textFaint }}>
            Angemeldet als {profile.email} – deine E-Mail ist für andere nie sichtbar.
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

        {/* Klasse */}
        <Card style={{ padding: 18 }}>
          <SectionTitle
            action={
              <Btn small variant="soft" onClick={onOpenKurswahl}>
                <Settings2 size={14} strokeWidth={1.8} /> Kurse verwalten
              </Btn>
            }
          >
            Deine Klasse
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
        </Card>

        {/* Mitglieder */}
        <Card style={{ padding: 18 }}>
          <SectionTitle>Klassenmitglieder</SectionTitle>
          {!mitglieder ? (
            <Spinner center />
          ) : (
            <div style={{ display: "grid", gap: 6 }}>
              {mitglieder.map((m) => {
                const istAdmin = adminIds.includes(m.uid);
                const istIch = m.uid === profile.uid;
                const letzterAdmin = istAdmin && adminIds.length === 1;
                return (
                  <div
                    key={m.uid}
                    style={{
                      display: "flex", alignItems: "center", gap: 10, padding: "8px 11px",
                      background: t.surface2, borderRadius: radius.sm, border: `1px solid ${t.border}`,
                    }}
                  >
                    <span
                      style={{
                        width: 30, height: 30, borderRadius: 999,
                        background: istAdmin ? t.warningSoft : t.accentSoft,
                        color: istAdmin ? t.warning : t.accent,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 13, fontWeight: 700, flexShrink: 0,
                      }}
                    >
                      {m.nickname?.[0]?.toUpperCase() || "?"}
                    </span>
                    <span style={{ flex: 1, minWidth: 0, fontSize: 13.5, fontWeight: 500, color: t.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {m.nickname} {istIch && <span style={{ color: t.textFaint }}>(du)</span>}
                    </span>
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
                  </div>
                );
              })}
            </div>
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
            <Btn small variant="dangerGhost" onClick={() => setDeleteOpen(true)}>
              <Trash2 size={13.5} strokeWidth={1.8} /> Klasse löschen
            </Btn>
          </Card>
        )}
      </div>

      {deleteOpen && (
        <ConfirmDialog
          title="Klasse endgültig löschen?"
          text={`„${klasse.name}" wird mit allen Kursen und Inhalten unwiderruflich gelöscht. Alle ${mitglieder?.length ?? ""} Mitglieder verlieren den Zugriff.`}
          confirmLabel="Ja, alles löschen"
          onConfirm={() => deleteKlasse(klasse.id)}
          onClose={() => setDeleteOpen(false)}
        />
      )}
    </div>
  );
}
