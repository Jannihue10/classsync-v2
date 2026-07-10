import { useNavigate } from "react-router-dom";
import { useKlasse } from "../context/KlasseContext";
import { useTheme } from "../context/ThemeContext";
import { Btn, Empty } from "../components/ui/UI";
import WeekGrid from "../components/kalender/WeekGrid";
import PageHeader from "../components/layout/PageHeader";

// Wochen-Stundenplan Mo–Fr, gebaut aus den Zeiten der eigenen Kurse
export default function StundenplanPage() {
  const { meineKurse } = useKlasse();
  const { t } = useTheme();
  const navigate = useNavigate();

  const hatZeiten = meineKurse.some((k) => k.zeiten?.length);

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto", padding: "20px 20px 40px" }}>
      <PageHeader
        icon="🗓️"
        title="Stundenplan"
        subtitle="Klick auf eine Stunde, um zum Kurs zu springen."
        action={<Btn small variant="ghost" onClick={() => navigate("/kalender")}>📅 Kalender</Btn>}
      />

      {!hatZeiten ? (
        <Empty
          icon="🗓️"
          text="Noch kein Stundenplan"
          sub="Trage bei deinen Kursen Unterrichtszeiten ein – der Plan baut sich automatisch auf."
          style={{ marginTop: 40 }}
        />
      ) : (
        <div
          style={{
            background: t.surface, border: `1px solid ${t.border}`,
            borderRadius: 14, overflow: "auto", maxHeight: "calc(100vh - 170px)",
          }}
        >
          <WeekGrid kurse={meineKurse} />
        </div>
      )}
    </div>
  );
}
