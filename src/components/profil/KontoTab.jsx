import { useState } from "react";
import { Check, LogOut, Mail, Moon, Scaling, Sun, User } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { Btn, Card, Input, SectionTitle } from "../ui/UI";
import SettingRow, { SegmentedControl } from "./SettingRow";
import DangerCard from "./DangerCard";

// Reihenfolge der UI-Größen-Auswahl (Werte in styles/theme.js: UI_SCALES)
const UI_SCALE_OPTIONS = [
  { key: "auto", label: "Auto" },
  { key: "klein", label: "Klein" },
  { key: "normal", label: "Normal" },
  { key: "gross", label: "Groß" },
];

const THEME_OPTIONS = [
  { key: "light", label: "Hell", icon: Sun },
  { key: "dark", label: "Dunkel", icon: Moon },
];

export default function KontoTab({ onOpenEmail, onOpenDeleteAccount }) {
  const { t, toggle, mode, scalePref, setScalePref } = useTheme();
  const { profile, logout, updateProfile } = useAuth();

  const [nickname, setNickname] = useState(profile.nickname);
  const [nickBusy, setNickBusy] = useState(false);
  const [nickSaved, setNickSaved] = useState(false);

  const nickUnchanged = nickname.trim().length < 2 || nickname.trim() === profile.nickname;

  async function handleNickname(e) {
    e.preventDefault();
    if (nickUnchanged) return;
    setNickBusy(true);
    try {
      await updateProfile({ nickname: nickname.trim() });
      setNickSaved(true);
      setTimeout(() => setNickSaved(false), 2000);
    } finally {
      setNickBusy(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <Card style={{ padding: "6px 18px 14px" }}>
        <SettingRow first icon={User} label="Nickname" hint="Für andere Klassenmitglieder sichtbar.">
          <form onSubmit={handleNickname} style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div style={{ width: 190 }}>
              <Input value={nickname} onChange={(e) => setNickname(e.target.value)} maxLength={24} />
            </div>
            <Btn type="submit" small disabled={nickBusy || nickUnchanged}>
              {nickBusy ? "Speichern…" : nickSaved ? (
                <>
                  <Check size={14} strokeWidth={2} /> Gespeichert
                </>
              ) : "Speichern"}
            </Btn>
          </form>
        </SettingRow>

        <SettingRow icon={Mail} label="E-Mail" hint={`${profile.email} – für andere nie sichtbar.`}>
          <Btn small variant="soft" onClick={onOpenEmail}>Ändern</Btn>
        </SettingRow>
      </Card>

      <Card style={{ padding: "6px 18px 14px" }}>
        <SettingRow first icon={Sun} label="Design">
          <SegmentedControl
            options={THEME_OPTIONS}
            value={mode}
            onChange={() => toggle()}
          />
        </SettingRow>

        <SettingRow
          icon={Scaling}
          label="UI-Größe"
          hint={'„Auto" vergrößert die Oberfläche nur auf Tablets.'}
        >
          <SegmentedControl options={UI_SCALE_OPTIONS} value={scalePref} onChange={setScalePref} />
        </SettingRow>
      </Card>

      <Card style={{ padding: 18 }}>
        <SectionTitle>Sitzung</SectionTitle>
        <Btn small variant="soft" onClick={logout}>
          <LogOut size={13.5} strokeWidth={1.8} /> Abmelden
        </Btn>
      </Card>

      <DangerCard
        title="Account löschen"
        text="Entfernt dein Konto endgültig aus allen Klassen und Kursen. Geteilte Inhalte bleiben mit deinem Nickname erhalten."
        buttonLabel="Account löschen"
        onClick={onOpenDeleteAccount}
      />
    </div>
  );
}
