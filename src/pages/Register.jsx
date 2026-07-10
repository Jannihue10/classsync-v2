import { useState } from "react";
import { useAuth, authErrorText } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { Btn, Input } from "../components/ui/UI";
import AuthLayout from "../components/layout/AuthLayout";

export default function Register({ onSwitchToLogin }) {
  const { register } = useAuth();
  const { t } = useTheme();
  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (nickname.trim().length < 2) {
      setError("Nickname muss mindestens 2 Zeichen haben.");
      return;
    }
    setBusy(true);
    try {
      await register(email, password, nickname);
      // Weiterleitung passiert automatisch über den Auth-Gate in App.jsx
    } catch (err) {
      setError(authErrorText(err));
      setBusy(false);
    }
  }

  return (
    <AuthLayout title="Konto erstellen" subtitle="Kostenlos – nur Nickname ist für andere sichtbar.">
      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 14 }}>
        <Input
          label="Nickname"
          required
          autoFocus
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="z. B. Alex"
          maxLength={24}
        />
        <Input
          label="E-Mail"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="du@beispiel.de"
        />
        <Input
          label="Passwort"
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="mind. 6 Zeichen"
          error={error}
        />
        <Btn type="submit" full disabled={busy}>
          {busy ? "Konto wird erstellt…" : "Registrieren"}
        </Btn>
      </form>
      <p style={{ textAlign: "center", fontSize: 13, color: t.textMuted, margin: "18px 0 0" }}>
        Schon ein Konto?{" "}
        <button
          onClick={onSwitchToLogin}
          style={{ background: "none", border: "none", padding: 0, color: t.accent, fontSize: 13, fontWeight: 700, cursor: "pointer" }}
        >
          Anmelden
        </button>
      </p>
    </AuthLayout>
  );
}
