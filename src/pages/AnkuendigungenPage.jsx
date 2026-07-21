import { useState } from "react";
import { Archive, Inbox, Megaphone } from "lucide-react";
import { useKlasse } from "../context/KlasseContext";
import { useTheme } from "../context/ThemeContext";
import { useAnkuendigungen } from "../context/AnkuendigungenContext";
import { RETENTION_DAYS } from "../lib/ankuendigungActions";
import { PAGE_PAD } from "../styles/theme";
import { Btn, Empty } from "../components/ui/UI";
import TabBar from "../components/ui/TabBar";
import PageHeader from "../components/layout/PageHeader";
import AnkuendigungCard from "../components/ankuendigungen/AnkuendigungCard";
import AnkuendigungModal from "../components/ankuendigungen/AnkuendigungModal";

// Ankündigungen der aktiven Klasse: „Aktuell" (letzte 30 Tage) und „Archiv".
export default function AnkuendigungenPage({ onOpenForm }) {
  const { t } = useTheme();
  const { isKlassenAdmin } = useKlasse();
  const { alle, aktuelle, archiv, ungelesene } = useAnkuendigungen();
  const [tab, setTab] = useState("aktuell");
  // Nur die ID merken und live auflösen – ein Snapshot wäre nach dem Bearbeiten veraltet
  // (und bliebe stehen, wenn die Ankündigung inzwischen gelöscht wurde).
  const [offenId, setOffenId] = useState(null);
  const offen = alle.find((a) => a.id === offenId) || null;

  const liste = tab === "aktuell" ? aktuelle : archiv;

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: `${PAGE_PAD}px ${PAGE_PAD}px 40px` }}>
      <PageHeader
        icon={Megaphone}
        title="Ankündigungen"
        subtitle="Wichtige Infos für die ganze Klasse"
        action={
          isKlassenAdmin && (
            <Btn onClick={onOpenForm}>
              <Megaphone size={14} strokeWidth={1.9} /> Neue Ankündigung
            </Btn>
          )
        }
      />

      <TabBar
        tabs={[
          { id: "aktuell", label: "Aktuell", icon: Inbox, badge: ungelesene.length },
          { id: "archiv", label: "Archiv", icon: Archive },
        ]}
        active={tab}
        onChange={setTab}
      />

      {liste.length === 0 ? (
        <Empty
          icon={tab === "aktuell" ? Megaphone : Archive}
          text={tab === "aktuell" ? "Keine Ankündigungen" : "Archiv ist leer"}
          sub={
            tab === "aktuell"
              ? isKlassenAdmin
                ? "Als Admin kannst du hier etwas an die ganze Klasse schicken."
                : "Wenn ein Admin etwas ankündigt, erscheint es hier."
              : `Ältere Ankündigungen landen hier, bis sie nach ${RETENTION_DAYS} Tagen automatisch gelöscht werden.`
          }
          style={{ marginTop: 20 }}
        />
      ) : (
        <div style={{ display: "grid", gap: 9 }}>
          {liste.map((ank) => (
            <AnkuendigungCard key={ank.id} ank={ank} onClick={() => setOffenId(ank.id)} />
          ))}
        </div>
      )}

      <p style={{ margin: "20px 2px 0", fontSize: 12, color: t.textFaint, lineHeight: 1.5 }}>
        Ankündigungen werden nach {RETENTION_DAYS} Tagen automatisch gelöscht – inklusive Anhang.
      </p>

      {offen && <AnkuendigungModal ank={offen} onClose={() => setOffenId(null)} />}
    </div>
  );
}
