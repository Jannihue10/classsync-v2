import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import KlasseForm, { KURSWAHL_FLAG } from "../components/modals/KlasseForm";
import DeleteAccountModal from "../components/modals/DeleteAccountModal";
import AuthLayout from "../components/layout/AuthLayout";

// Re-Export für bestehende Importe (AppShell liest das Kurswahl-Flag)
export { KURSWAHL_FLAG };

export default function Onboarding() {
  const { profile, logout } = useAuth();
  const { t } = useTheme();
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <AuthLayout
      title={`Hi, ${profile?.nickname || ""}!`}
      subtitle="Tritt deiner Klasse bei oder erstelle eine neue."
    >
      <KlasseForm uid={profile.uid} />

      <div style={{ display: "flex", justifyContent: "center", gap: 16, marginTop: 20 }}>
        <button
          onClick={logout}
          style={{
            background: "none", border: "none", padding: 0,
            color: t.textFaint, fontSize: 12.5, cursor: "pointer",
          }}
        >
          Abmelden
        </button>
        <button
          onClick={() => setDeleteOpen(true)}
          style={{
            background: "none", border: "none", padding: 0,
            color: t.textFaint, fontSize: 12.5, cursor: "pointer",
          }}
        >
          Konto löschen
        </button>
      </div>

      {/* Klassenlos: myClasses ist leer -> kein Letzter-Admin-Fall */}
      {deleteOpen && <DeleteAccountModal myClasses={[]} onClose={() => setDeleteOpen(false)} />}
    </AuthLayout>
  );
}
