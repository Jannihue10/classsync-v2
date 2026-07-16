import { useState } from "react";
import { ArrowRightLeft, Check, GraduationCap, Users } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { createKlasse, endMigration, startMigration } from "../../lib/klasseActions";
import { radius } from "../../styles/theme";
import { Btn, Divider, Input, Modal, ModalHeader } from "../ui/UI";

// Schuljahres-Migration: übernimmt die aktuellen Mitglieder der (Quell-)Klasse per Einladung
// in eine neue ODER bestehende, selbst-administrierte Zielklasse. Mitglieder bleiben in der alten.
export default function MigrateKlasseModal({ klasse, mitglieder, myClasses, onClose }) {
  const { t } = useTheme();
  const { profile } = useAuth();
  const uid = profile.uid;

  const running = klasse.migration || null;
  const bannedIds = klasse.bannedIds || [];
  // Einzuladende Mitglieder = aktuelle Klassenmitglieder ohne Gesperrte
  const memberIds = (mitglieder || [])
    .map((m) => m.uid)
    .filter((id) => !bannedIds.includes(id));

  // Bestehende Ziele: andere Klassen, die ich selbst administriere
  const adminTargets = (myClasses || []).filter(
    (c) => c.id !== klasse.id && (c.adminIds || []).includes(uid)
  );

  const [mode, setMode] = useState(adminTargets.length ? "existing" : "new");
  const [newName, setNewName] = useState("");
  const [existingId, setExistingId] = useState(adminTargets[0]?.id || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleStart(e) {
    e.preventDefault();
    setError("");
    if (mode === "new" && newName.trim().length < 2) {
      setError("Der Klassenname muss mindestens 2 Zeichen haben.");
      return;
    }
    if (mode === "existing" && !existingId) {
      setError("Bitte eine Zielklasse wählen.");
      return;
    }
    setBusy(true);
    try {
      let target;
      if (mode === "new") {
        const newId = await createKlasse(newName, uid);
        target = { id: newId, name: newName.trim() };
      } else {
        const c = adminTargets.find((x) => x.id === existingId);
        target = { id: c.id, name: c.name };
      }
      await startMigration(klasse.id, target, memberIds);
      onClose();
    } catch (err) {
      setError(err.message || "Migration konnte nicht gestartet werden.");
      setBusy(false);
    }
  }

  async function handleEnd() {
    setBusy(true);
    try {
      await endMigration(klasse.id);
      onClose();
    } catch {
      setBusy(false);
    }
  }

  // ── Läuft bereits ──────────────────────────────────────────────────────────
  if (running) {
    return (
      <Modal width={460} onClose={busy ? undefined : onClose}>
        <ModalHeader
          title="Migration läuft"
          subtitle={`„${klasse.name}" wird ins neue Schuljahr übernommen.`}
          onClose={busy ? undefined : onClose}
        />
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: t.surface2, borderRadius: radius.md, border: `1px solid ${t.border}` }}>
          <span style={{ width: 34, height: 34, borderRadius: 9, background: t.accentSoft, color: t.accent, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <GraduationCap size={18} strokeWidth={1.8} />
          </span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: t.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              Ziel: {running.targetName}
            </div>
            <div style={{ fontSize: 12.5, color: t.textMuted, display: "flex", alignItems: "center", gap: 5, marginTop: 2 }}>
              <Users size={12} strokeWidth={1.8} /> {(running.memberIds || []).length} Mitglieder eingeladen
            </div>
          </div>
        </div>
        <p style={{ margin: "12px 0 0", fontSize: 12.5, color: t.textFaint, lineHeight: 1.55 }}>
          Mitglieder sehen einen Hinweis und treten der Zielklasse selbst bei. Bereits beigetretene
          bleiben dort, wenn du die Migration beendest.
        </p>
        <Divider />
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <Btn small variant="ghost" onClick={onClose} disabled={busy}>Schließen</Btn>
          <Btn small variant="dangerGhost" onClick={handleEnd} disabled={busy}>
            {busy ? "Wird beendet…" : "Migration beenden"}
          </Btn>
        </div>
      </Modal>
    );
  }

  // ── Neue Migration starten ─────────────────────────────────────────────────
  const modeBtn = (val, label) => (
    <button
      type="button"
      onClick={() => { setMode(val); setError(""); }}
      style={{
        flex: 1, padding: "8px 0", border: "none", borderRadius: radius.sm,
        background: mode === val ? t.surface : "transparent",
        color: mode === val ? t.text : t.textMuted,
        fontWeight: 700, fontSize: 13, cursor: "pointer",
        boxShadow: mode === val ? t.shadow : "none",
      }}
    >
      {label}
    </button>
  );

  return (
    <Modal width={480} onClose={busy ? undefined : onClose}>
      <ModalHeader
        title="Ins neue Schuljahr übernehmen"
        subtitle={`Lädt die ${memberIds.length} Mitglieder von „${klasse.name}" in eine Zielklasse ein.`}
        onClose={busy ? undefined : onClose}
      />

      <form onSubmit={handleStart} style={{ display: "grid", gap: 14 }}>
        <div style={{ display: "flex", gap: 4, background: t.surface2, borderRadius: radius.md, padding: 4 }}>
          {modeBtn("new", "Neue Klasse")}
          {modeBtn("existing", "Bestehende Klasse")}
        </div>

        {mode === "new" ? (
          <Input
            label="Name der neuen Klasse"
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="z. B. 11b — Gymnasium Musterstadt"
            maxLength={40}
            error={error}
          />
        ) : adminTargets.length === 0 ? (
          <p style={{ margin: 0, fontSize: 13, color: t.textMuted, lineHeight: 1.55 }}>
            Du administrierst keine andere Klasse. Wechsle zu „Neue Klasse" oder erstelle zuerst eine.
          </p>
        ) : (
          <div style={{ display: "grid", gap: 6 }}>
            {adminTargets.map((c) => {
              const sel = c.id === existingId;
              return (
                <button
                  type="button"
                  key={c.id}
                  onClick={() => setExistingId(c.id)}
                  style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "9px 11px", textAlign: "left",
                    background: t.surface2, borderRadius: radius.sm, cursor: "pointer",
                    border: `1px solid ${sel ? t.accent : t.border}`,
                  }}
                >
                  <span style={{ width: 28, height: 28, borderRadius: 8, background: t.accentSoft, color: t.accent, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <GraduationCap size={15} strokeWidth={1.8} />
                  </span>
                  <span style={{ flex: 1, minWidth: 0, fontSize: 13.5, fontWeight: 500, color: t.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {c.name}
                  </span>
                  {sel && <Check size={16} strokeWidth={2} color={t.accent} style={{ flexShrink: 0 }} />}
                </button>
              );
            })}
            {error && <div style={{ fontSize: 12, color: t.danger }}>{error}</div>}
          </div>
        )}

        <p style={{ margin: 0, fontSize: 12.5, color: t.textFaint, lineHeight: 1.55 }}>
          Alle aktuellen Mitglieder erhalten eine Einladung und treten selbst bei. Sie bleiben
          weiterhin Mitglied dieser Klasse.
        </p>

        <Divider />
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <Btn small variant="ghost" type="button" onClick={onClose} disabled={busy}>Abbrechen</Btn>
          <Btn small type="submit" disabled={busy || (mode === "existing" && adminTargets.length === 0)}>
            <ArrowRightLeft size={13.5} strokeWidth={1.8} />
            {busy ? "Wird gestartet…" : "Migration starten"}
          </Btn>
        </div>
      </form>
    </Modal>
  );
}
