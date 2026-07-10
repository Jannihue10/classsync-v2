import { useState } from "react";
import { firebaseConfigured } from "./lib/firebase";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { KlasseProvider, useKlasse } from "./context/KlasseContext";
import { NotificationProvider } from "./context/NotificationContext";
import { useTheme } from "./context/ThemeContext";
import { Spinner } from "./components/ui/UI";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Onboarding from "./pages/Onboarding";
import AppShell from "./components/layout/AppShell";
import AuthLayout from "./components/layout/AuthLayout";

export default function App() {
  if (!firebaseConfigured) return <SetupHinweis />;
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  );
}

function Gate() {
  const { user, profile, loading, profileLoading } = useAuth();
  const [authMode, setAuthMode] = useState(() =>
    new URLSearchParams(window.location.search).get("register") === "true" ? "register" : "login"
  );

  if (loading) return <FullSpinner />;

  if (!user) {
    return authMode === "register" ? (
      <Register onSwitchToLogin={() => setAuthMode("login")} />
    ) : (
      <Login onSwitchToRegister={() => setAuthMode("register")} />
    );
  }

  // Eingeloggt, aber Firestore-Profil lädt noch (oder wird gerade beim Registrieren angelegt)
  if (profileLoading || !profile) return <FullSpinner />;

  if (!profile.klasseId) return <Onboarding />;

  return (
    <KlasseProvider klasseId={profile.klasseId}>
      <KlasseGate />
    </KlasseProvider>
  );
}

// Wartet bis Klasse + Kurse geladen sind; wirft ins Onboarding zurück, wenn die Klasse gelöscht wurde
function KlasseGate() {
  const { klasse, loading } = useKlasse();
  if (loading) return <FullSpinner />;
  if (!klasse) return <Onboarding />;
  return (
    <NotificationProvider>
      <AppShell />
    </NotificationProvider>
  );
}

function FullSpinner() {
  const { t } = useTheme();
  return (
    <div style={{ minHeight: "100vh", background: t.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Spinner size={34} />
    </div>
  );
}

// Wird angezeigt, solange keine Firebase-Keys in .env.local eingetragen sind
function SetupHinweis() {
  const { t } = useTheme();
  const code = (txt) => (
    <code style={{ background: t.surface2, padding: "2px 6px", borderRadius: 5, fontSize: 12.5 }}>{txt}</code>
  );
  return (
    <AuthLayout title="Firebase einrichten" subtitle="Die App braucht noch ein Firebase-Projekt." width={480}>
      <ol style={{ margin: 0, paddingLeft: 20, color: t.textMuted, fontSize: 13.5, lineHeight: 2 }}>
        <li>Neues Projekt auf {code("console.firebase.google.com")} anlegen</li>
        <li>Web-App hinzufügen und die Konfigurationswerte kopieren</li>
        <li><b>Authentication</b> → Anmeldemethode <b>E-Mail/Passwort</b> aktivieren</li>
        <li><b>Firestore</b> und <b>Storage</b> aktivieren</li>
        <li>Keys in {code(".env.local")} eintragen und den Dev-Server neu starten</li>
        <li>{code("firestore.rules")} und {code("storage.rules")} in der Console veröffentlichen</li>
        <li>IAM: Storage-Dienstkonto braucht die Rolle <b>Cloud Datastore User</b></li>
      </ol>
    </AuthLayout>
  );
}
