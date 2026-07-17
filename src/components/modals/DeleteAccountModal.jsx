import { useState } from "react";
import { TriangleAlert } from "lucide-react";
import { authErrorText, useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { deleteAccount } from "../../lib/authActions";
import { Btn, Input, Modal, ModalHeader } from "../ui/UI";

// Account endgültig löschen. Reauth per Passwort, dann clientseitiger Cleanup + Auth-Delete.
// Bei Erfolg räumt Firebase die Session ab -> das Auth-Gate rendert automatisch den Login.
// myClasses als Prop (nicht aus dem Klassen-Kontext), damit das Modal auch im Onboarding
// (klassenlos, außerhalb des MembershipsProvider) nutzbar ist.
export default function DeleteAccountModal({ onClose, myClasses = [] }) {
  const { t } = useTheme();
  const { user, profile } = useAuth();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!password) return;
    setBusy(true);
    try {
      await deleteAccount({ user, profile, myClasses, currentPassword: password });
      // Session ist weg -> Gate wechselt zum Login; kein onClose/Routing nötig.
    } catch (err) {
      // Letzter-Admin-Block und Reauth-Fehler sichtbar machen (eigene Codes bevorzugt).
      setError(err?.code === "account/last-admin" ? err.message : authErrorText(err));
      setBusy(false);
    }
  }

  return (
    <Modal width={440} onClose={busy ? undefined : onClose}>
      <ModalHeader title="Account löschen" onClose={busy ? undefined : onClose} />

      <div
        style={{
          display: "flex", gap: 12, alignItems: "flex-start", padding: 14, marginBottom: 16,
          background: t.dangerSoft, borderRadius: 10, border: `1px solid ${t.danger}33`,
        }}
      >
        <TriangleAlert size={20} strokeWidth={1.8} color={t.danger} style={{ flexShrink: 0, marginTop: 1 }} />
        <p style={{ margin: 0, fontSize: 13.5, color: t.text, lineHeight: 1.55 }}>
          Dein Konto wird <b>endgültig</b> gelöscht und du wirst aus allen Klassen und Kursen entfernt.
          Bereits geteilte Materialien, Hausaufgaben und Nachrichten bleiben (mit deinem Nickname) in
          den Klassen erhalten. Dies kann nicht rückgängig gemacht werden.
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 14 }}>
        <Input
          label="Passwort zur Bestätigung"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={error || undefined}
        />
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <Btn type="button" variant="ghost" onClick={onClose} disabled={busy}>Abbrechen</Btn>
          <Btn type="submit" variant="danger" disabled={busy || !password}>
            {busy ? "Wird gelöscht…" : "Account löschen"}
          </Btn>
        </div>
      </form>
    </Modal>
  );
}
