import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import KlasseForm, { KURSWAHL_FLAG } from "../components/modals/KlasseForm";
import AuthLayout from "../components/layout/AuthLayout";

// Re-Export für bestehende Importe (AppShell liest das Kurswahl-Flag)
export { KURSWAHL_FLAG };

export default function Onboarding() {
  const { profile, logout } = useAuth();
  const { t } = useTheme();

  return (
    <AuthLayout
      title={`Hi, ${profile?.nickname || ""}!`}
      subtitle="Tritt deiner Klasse bei oder erstelle eine neue."
    >
      <KlasseForm uid={profile.uid} />

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
