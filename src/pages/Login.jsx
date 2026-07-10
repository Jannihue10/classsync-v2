import { useState } from "react";
import { useAuth, authErrorText } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { Btn, Input } from "../components/ui/UI";
import AuthLayout from "../components/layout/AuthLayout";

export default function Login({ onSwitchToRegister }) {
  const { login, resetPassword } = useAuth();
  const { t } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(authErrorText(err));
      setBusy(false);
    }
  }

  async function handleReset(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await resetPassword(email);
      setResetSent(true);
    } catch (err) {
      setError(authErrorText(err));
    }
    setBusy(false);
  }

  if (resetMode) {
    return (
      <AuthLayout title="Passwort zurücksetzen" subtitle="Wir senden dir einen Link zum Zurücksetzen.">
        {resetSent ? (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 34, marginBottom: 12 }}>📬</div>
            <p style={{ color: t.textMuted, fontSize: 14, margin: "0 0 20px" }}>
              E-Mail verschickt! Prüfe dein Postfach (auch den Spam-Ordner) und folge dem Link.
            </p>
            <Btn full variant="ghost" onClick={() => { setResetMode(false); setResetSent(false); }}>
              Zurück zum Login
            </Btn>
          </div>
        ) : (
          <form onSubmit={handleReset} style={{ display: "grid", gap: 14 }}>
            <Input
              label="E-Mail"
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="du@beispiel.de"
              error={error}
            />
            <Btn type="submit" full disabled={busy}>
              {busy ? "Wird gesendet…" : "Reset-Link senden"}
            </Btn>
            <button type="button" onClick={() => setResetMode(false)} style={linkStyle(t)}>
              Zurück zum Login
            </button>
          </form>
        )}
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Willkommen zurück" subtitle="Melde dich an, um weiterzumachen.">
      <form onSubmit={handleLogin} style={{ display: "grid", gap: 14 }}>
        <Input
          label="E-Mail"
          type="email"
          required
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="du@beispiel.de"
        />
        <div>
          <Input
            label="Passwort"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            error={error}
          />
          <button type="button" onClick={() => { setResetMode(true); setError(""); }} style={{ ...linkStyle(t), marginTop: 8 }}>
            Passwort vergessen?
          </button>
        </div>
        <Btn type="submit" full disabled={busy}>
          {busy ? "Anmelden…" : "Anmelden"}
        </Btn>
      </form>
      <p style={{ textAlign: "center", fontSize: 13, color: t.textMuted, margin: "18px 0 0" }}>
        Noch kein Konto?{" "}
        <button onClick={onSwitchToRegister} style={{ ...linkStyle(t), display: "inline", fontWeight: 700 }}>
          Registrieren
        </button>
      </p>
    </AuthLayout>
  );
}

const linkStyle = (t) => ({
  background: "none",
  border: "none",
  padding: 0,
  color: t.accent,
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
});
