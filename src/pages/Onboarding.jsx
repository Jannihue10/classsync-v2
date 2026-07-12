import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { createKlasse, joinByCode } from "../lib/klasseActions";
import { Btn, Input } from "../components/ui/UI";
import AuthLayout from "../components/layout/AuthLayout";
import { radius } from "../styles/theme";

// Nach dem Beitritt per Code soll einmalig das Kurswahlmodal erscheinen (AppShell liest das Flag)
export const KURSWAHL_FLAG = "classsync_showKurswahl";

export default function Onboarding() {
  const { profile, logout } = useAuth();
  const { t } = useTheme();
  const [tab, setTab] = useState("join"); // "join" | "create"
  const [code, setCode] = useState("");
  const [klassenName, setKlassenName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleJoin(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await joinByCode(code, profile.uid);
      sessionStorage.setItem(KURSWAHL_FLAG, "1");
    } catch (err) {
      setError(err.message || "Beitritt fehlgeschlagen.");
      setBusy(false);
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    setError("");
    if (klassenName.trim().length < 2) {
      setError("Der Klassenname muss mindestens 2 Zeichen haben.");
      return;
    }
    setBusy(true);
    try {
      await createKlasse(klassenName, profile.uid);
    } catch (err) {
      setError("Klasse konnte nicht erstellt werden.");
      setBusy(false);
    }
  }

  const tabStyle = (active) => ({
    flex: 1,
    padding: "9px 0",
    border: "none",
    borderRadius: radius.sm,
    background: active ? t.surface : "transparent",
    color: active ? t.text : t.textMuted,
    fontWeight: 700,
    fontSize: 13.5,
    cursor: "pointer",
    boxShadow: active ? t.shadow : "none",
  });

  return (
    <AuthLayout
      title={`Hi, ${profile?.nickname || ""}!`}
      subtitle="Tritt deiner Klasse bei oder erstelle eine neue."
    >
      <div style={{ display: "flex", gap: 4, background: t.surface2, borderRadius: radius.md, padding: 4, marginBottom: 20 }}>
        <button style={tabStyle(tab === "join")} onClick={() => { setTab("join"); setError(""); }}>
          Klasse beitreten
        </button>
        <button style={tabStyle(tab === "create")} onClick={() => { setTab("create"); setError(""); }}>
          Klasse erstellen
        </button>
      </div>

      {tab === "join" ? (
        <form onSubmit={handleJoin} style={{ display: "grid", gap: 14 }}>
          <Input
            label="Zugangscode"
            required
            autoFocus
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="z. B. X7K2P"
            maxLength={5}
            style={{ textTransform: "uppercase", letterSpacing: 4, fontWeight: 700, textAlign: "center", fontSize: 18 }}
            error={error}
          />
          <p style={{ margin: 0, fontSize: 12.5, color: t.textFaint }}>
            Den 5-stelligen Code bekommst du von einem Mitschüler, der die Klasse erstellt hat.
          </p>
          <Btn type="submit" full disabled={busy || code.length < 5}>
            {busy ? "Beitreten…" : "Beitreten"}
          </Btn>
        </form>
      ) : (
        <form onSubmit={handleCreate} style={{ display: "grid", gap: 14 }}>
          <Input
            label="Klassenname"
            required
            autoFocus
            value={klassenName}
            onChange={(e) => setKlassenName(e.target.value)}
            placeholder="z. B. 10b — Gymnasium Musterstadt"
            maxLength={40}
            error={error}
          />
          <p style={{ margin: 0, fontSize: 12.5, color: t.textFaint }}>
            Du wirst automatisch Admin und bekommst einen Zugangscode für deine Mitschüler.
          </p>
          <Btn type="submit" full disabled={busy}>
            {busy ? "Wird erstellt…" : "Klasse erstellen"}
          </Btn>
        </form>
      )}

      <button
        onClick={logout}
        style={{
          background: "none", border: "none", padding: 0, marginTop: 20,
          color: t.textFaint, fontSize: 12.5, cursor: "pointer", width: "100%", textAlign: "center",
        }}
      >
        Abmelden
      </button>
    </AuthLayout>
  );
}
