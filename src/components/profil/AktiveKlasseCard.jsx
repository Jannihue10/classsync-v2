import { useState } from "react";
import { ArrowRightLeft, Check, Copy, LogOut, Settings2 } from "lucide-react";
import { useKlasse } from "../../context/KlasseContext";
import { useTheme } from "../../context/ThemeContext";
import { radius } from "../../styles/theme";
import { Btn, Card, Divider, SectionTitle } from "../ui/UI";

// Aktive Klasse: Name, Code, Verwaltungs-Aktionen
export default function AktiveKlasseCard({ mitgliederCount, letzterAdminIch, onOpenKurswahl, onMigrate, onLeave }) {
  const { t } = useTheme();
  const { klasse, isKlassenAdmin } = useKlasse();
  const [copied, setCopied] = useState(false);

  function copyCode() {
    navigator.clipboard?.writeText(klasse.code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    });
  }

  return (
    <Card style={{ padding: 18 }}>
      <SectionTitle
        action={
          <Btn small variant="soft" onClick={onOpenKurswahl}>
            <Settings2 size={14} strokeWidth={1.8} /> Kurse verwalten
          </Btn>
        }
      >
        Aktive Klasse
      </SectionTitle>

      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 180 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: t.text }}>{klasse.name}</div>
          <div style={{ fontSize: 12.5, color: t.textMuted, marginTop: 2 }}>
            {mitgliederCount ?? "…"} Mitglieder
          </div>
        </div>
        <button
          onClick={copyCode}
          title="Code kopieren"
          style={{
            display: "flex", alignItems: "center", gap: 8, padding: "9px 14px",
            background: t.accentSoft, border: `1px dashed ${t.accent}66`, borderRadius: radius.sm,
            cursor: "pointer",
          }}
        >
          <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: 4, color: t.accent }}>
            {klasse.code}
          </span>
          <span style={{ fontSize: 11.5, fontWeight: 600, color: t.textMuted, display: "inline-flex", alignItems: "center", gap: 4 }}>
            {copied ? (
              <>
                <Check size={12} strokeWidth={2.2} /> Kopiert
              </>
            ) : (
              <>
                <Copy size={12} strokeWidth={1.8} /> Kopieren
              </>
            )}
          </span>
        </button>
      </div>
      <p style={{ margin: "10px 0 0", fontSize: 12.5, color: t.textFaint }}>
        Mit diesem Code können Mitschüler deiner Klasse beitreten.
      </p>

      <Divider />
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        {isKlassenAdmin && (
          <Btn small variant="soft" onClick={onMigrate}>
            <ArrowRightLeft size={13.5} strokeWidth={1.8} />
            {klasse.migration ? "Migration verwalten" : "Ins neue Schuljahr übernehmen"}
          </Btn>
        )}
        {letzterAdminIch ? (
          <p style={{ margin: 0, fontSize: 12.5, color: t.textFaint }}>
            Als letzter Admin kannst du die Klasse nicht verlassen – übertrage zuerst die Admin-Rolle
            oder lösche die Klasse.
          </p>
        ) : (
          <Btn small variant="dangerGhost" onClick={onLeave}>
            <LogOut size={13.5} strokeWidth={1.8} /> Klasse verlassen
          </Btn>
        )}
      </div>
    </Card>
  );
}
