import { useEffect, useRef, useState } from "react";
import { MailCheck } from "lucide-react";
import { useAuth, authErrorText } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { Btn } from "../components/ui/UI";
import AuthLayout from "../components/layout/AuthLayout";

const COOLDOWN = 60; // Sekunden zwischen zwei Versänden

export default function VerifyEmail() {
  const { user, sendVerification, reloadVerification, logout } = useAuth();
  const { t } = useTheme();
  const [error, setError] = useState("");
  const [notVerified, setNotVerified] = useState(false);
  const [checking, setChecking] = useState(false);
  const [cooldown, setCooldown] = useState(COOLDOWN);
  const sentOnce = useRef(false); // verhindert Doppelversand (StrictMode-Doppel-Mount)

  // Einmaliger Auto-Versand beim Öffnen des Screens
  useEffect(() => {
    if (sentOnce.current) return;
    sentOnce.current = true;
    sendVerification().catch((err) => setError(authErrorText(err)));
  }, [sendVerification]);

  // Cooldown-Countdown
  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((c) => (c <= 1 ? 0 : c - 1)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  async function handleCheck() {
    setError("");
    setNotVerified(false);
    setChecking(true);
    try {
      const verified = await reloadVerification();
      // Bei true rendert der Gate in App.jsx automatisch weiter.
      if (!verified) setNotVerified(true);
    } catch (err) {
      setError(authErrorText(err));
    }
    setChecking(false);
  }

  async function handleResend() {
    if (cooldown > 0) return;
    setError("");
    setNotVerified(false);
    try {
      await sendVerification();
      setCooldown(COOLDOWN);
    } catch (err) {
      setError(authErrorText(err));
    }
  }

  return (
    <AuthLayout title="E-Mail bestätigen" subtitle="Nur noch ein kurzer Schritt.">
      <div style={{ textAlign: "center" }}>
        <span
          style={{
            width: 46, height: 46, borderRadius: 999, margin: "0 auto 14px",
            background: t.successSoft, color: t.success,
            display: "inline-flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <MailCheck size={22} strokeWidth={1.8} />
        </span>
        <p style={{ color: t.textMuted, fontSize: 14, lineHeight: 1.6, margin: "0 0 20px" }}>
          Wir haben einen Bestätigungslink an{" "}
          <b style={{ color: t.text }}>{user?.email}</b> geschickt. Öffne die E-Mail
          (auch den Spam-Ordner prüfen) und klicke auf den Link.
        </p>

        {error && (
          <p style={{ color: t.danger, fontSize: 13, margin: "0 0 14px" }}>{error}</p>
        )}
        {notVerified && !error && (
          <p style={{ color: t.textMuted, fontSize: 13, margin: "0 0 14px" }}>
            Noch nicht bestätigt. Bitte klicke zuerst den Link in der E-Mail und versuche
            es dann erneut.
          </p>
        )}

        <div style={{ display: "grid", gap: 10 }}>
          <Btn full disabled={checking} onClick={handleCheck}>
            {checking ? "Wird geprüft…" : "Ich habe meine E-Mail bestätigt"}
          </Btn>
          <Btn full variant="ghost" disabled={cooldown > 0} onClick={handleResend}>
            {cooldown > 0 ? `Erneut senden in ${cooldown}s` : "E-Mail erneut senden"}
          </Btn>
        </div>

        <button
          type="button"
          onClick={logout}
          style={{
            background: "none", border: "none", padding: 0, marginTop: 18,
            color: t.textMuted, fontSize: 13, fontWeight: 600, cursor: "pointer",
          }}
        >
          Abmelden
        </button>
      </div>
    </AuthLayout>
  );
}
