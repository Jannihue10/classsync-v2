import { useState } from "react";
import { MailCheck } from "lucide-react";
import { authErrorText, useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { Btn, Input, Modal, ModalHeader } from "../ui/UI";

// E-Mail-Adresse ändern: neue Adresse + aktuelles Passwort (Reauth). Nach Erfolg wird ein
// Bestätigungslink an die neue Adresse geschickt – die Änderung wird erst nach Klick wirksam.
export default function ChangeEmailModal({ onClose }) {
  const { t } = useTheme();
  const { profile, changeEmail } = useAuth();
  const [newEmail, setNewEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    const next = newEmail.trim();
    if (!next || !password) return;
    if (next.toLowerCase() === (profile.email || "").toLowerCase()) {
      setError("Das ist bereits deine aktuelle E-Mail-Adresse.");
      return;
    }
    setBusy(true);
    try {
      await changeEmail(next, password);
      setSent(true);
    } catch (err) {
      setError(authErrorText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal width={440} onClose={busy ? undefined : onClose}>
      <ModalHeader
        title="E-Mail-Adresse ändern"
        subtitle={sent ? undefined : `Aktuell: ${profile.email}`}
        onClose={busy ? undefined : onClose}
      />

      {sent ? (
        <div>
          <div
            style={{
              display: "flex", gap: 12, alignItems: "flex-start", padding: 14,
              background: t.accentSoft, borderRadius: 10, border: `1px solid ${t.accent}33`,
            }}
          >
            <MailCheck size={20} strokeWidth={1.8} color={t.accent} style={{ flexShrink: 0, marginTop: 1 }} />
            <p style={{ margin: 0, fontSize: 13.5, color: t.text, lineHeight: 1.55 }}>
              Wir haben einen Bestätigungslink an <b>{newEmail.trim()}</b> gesendet. Öffne die Mail
              und klicke den Link – erst danach wird die neue Adresse aktiv. Prüfe ggf. den Spam-Ordner.
            </p>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20 }}>
            <Btn onClick={onClose}>Fertig</Btn>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 14 }}>
          <Input
            label="Neue E-Mail-Adresse"
            type="email"
            autoComplete="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="neue@adresse.de"
          />
          <Input
            label="Aktuelles Passwort (zur Bestätigung)"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={error || undefined}
          />
          <p style={{ margin: 0, fontSize: 12.5, color: t.textFaint, lineHeight: 1.5 }}>
            Zur Bestätigung schicken wir einen Link an die neue Adresse. Die Änderung wird erst
            nach dem Klick wirksam.
          </p>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <Btn type="button" variant="ghost" onClick={onClose} disabled={busy}>Abbrechen</Btn>
            <Btn type="submit" disabled={busy || !newEmail.trim() || !password}>
              {busy ? "Wird gesendet…" : "Link senden"}
            </Btn>
          </div>
        </form>
      )}
    </Modal>
  );
}
