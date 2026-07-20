import { Trash2, TriangleAlert } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import { Btn, Card, SectionTitle } from "../ui/UI";

// Eine rote Karte fuer alle unwiderruflichen Aktionen – wird pro Tab
// kontextuell gerendert (Konto: Account, Klassen: Klasse loeschen).
export default function DangerCard({ title, text, buttonLabel, onClick, error }) {
  const { t } = useTheme();
  return (
    <Card style={{ padding: 18, borderColor: `${t.danger}44` }}>
      <SectionTitle>
        <TriangleAlert size={15} strokeWidth={1.8} color={t.danger} /> {title}
      </SectionTitle>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <p style={{ margin: 0, fontSize: 12.5, color: t.textMuted, lineHeight: 1.5, flex: "1 1 260px" }}>
          {text}
        </p>
        <Btn small variant="dangerGhost" onClick={onClick}>
          <Trash2 size={13.5} strokeWidth={1.8} /> {buttonLabel}
        </Btn>
      </div>
      {error && (
        <p style={{ margin: "12px 0 0", fontSize: 12.5, color: t.danger, lineHeight: 1.5, wordBreak: "break-word" }}>
          Löschen fehlgeschlagen: {error}
        </p>
      )}
    </Card>
  );
}
