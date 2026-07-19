import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarCheck, CheckCircle2, FolderOpen, GraduationCap } from "lucide-react";
import DateiIcon from "../components/ui/DateiIcon";
import { useAuth } from "../context/AuthContext";
import { useKlasse } from "../context/KlasseContext";
import { useTheme } from "../context/ThemeContext";
import { useAcrossKurse } from "../lib/useAcrossKurse";
import { tsMillis } from "../lib/useKursCollection";
import { calcTage, formatDatum, relativeTime, tageLabel } from "../lib/dates";
import { MAT_COLORS } from "../lib/faecher";
import { pruefungColor } from "../components/kurs/PruefungenSection";
import { toggleDone } from "../components/kurs/HASection";
import { PAGE_PAD, radius } from "../styles/theme";
import { Card, Empty, Pill, SectionTitle, Tag } from "../components/ui/UI";
import PageHeader from "../components/layout/PageHeader";

// Startseite: offene HAs + kommende Prüfungen + neueste Materialien der eigenen Kurse
export default function UebersichtPage() {
  const { t } = useTheme();
  const { profile } = useAuth();
  const { klasse, meineKurse } = useKlasse();
  const navigate = useNavigate();

  const hausaufgaben = useAcrossKurse("hausaufgaben");
  const pruefungen = useAcrossKurse("pruefungen");
  const materialien = useAcrossKurse("materialien");

  const offeneHAs = useMemo(
    () =>
      hausaufgaben
        .filter((h) => !h.hiddenBy?.includes(profile.uid) && !h.doneBy?.includes(profile.uid))
        .sort((a, b) => (a.faellig || "").localeCompare(b.faellig || "")),
    [hausaufgaben, profile.uid]
  );

  const kommende = useMemo(
    () =>
      pruefungen
        .map((p) => ({ ...p, tage: calcTage(p.datum) }))
        .filter((p) => p.tage !== null && p.tage >= 0)
        .sort((a, b) => a.tage - b.tage),
    [pruefungen]
  );

  const neueste = useMemo(
    () =>
      [...materialien]
        .sort((a, b) => tsMillis(b.createdAt) - tsMillis(a.createdAt))
        .slice(0, 8),
    [materialien]
  );

  const kursChip = (kurs) => (
    <span
      style={{
        display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 600,
        color: kurs.farbe, background: `${kurs.farbe}1a`, borderRadius: 999, padding: "2px 8px",
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: 999, background: kurs.farbe }} />
      {kurs.name}
    </span>
  );

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto", padding: `${PAGE_PAD}px ${PAGE_PAD}px 40px` }}>
      <PageHeader
        title={`Hi, ${profile.nickname}`}
        subtitle={`${klasse.name} · ${meineKurse.length} Kurse`}
      />

      {meineKurse.length === 0 ? (
        <Empty
          icon={GraduationCap}
          text="Leg los!"
          sub={'Erstelle deinen ersten Kurs über das „+" in der Sidebar oder wähle bestehende Kurse über „Kurse verwalten".'}
          style={{ marginTop: 40 }}
        />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16, alignItems: "start" }}>
          {/* Offene Hausaufgaben */}
          <Card style={{ padding: 16 }}>
            <SectionTitle>Offene Hausaufgaben {offeneHAs.length > 0 && <span style={{ color: t.textFaint, fontWeight: 500 }}>({offeneHAs.length})</span>}</SectionTitle>
            {offeneHAs.length === 0 ? (
              <Empty icon={CheckCircle2} text="Alles erledigt" style={{ padding: "18px 10px" }} />
            ) : (
              <div style={{ display: "grid", gap: 7 }}>
                {offeneHAs.map((ha) => {
                  const tage = calcTage(ha.faellig);
                  const ueberfaellig = tage !== null && tage < 0;
                  return (
                    <div
                      key={`${ha.kursId}-${ha.id}`}
                      onClick={() => navigate(`/kurs/${ha.kursId}`)}
                      style={{
                        display: "flex", alignItems: "center", gap: 9, padding: "9px 11px",
                        background: t.surface2, borderRadius: radius.sm, border: `1px solid ${t.border}`,
                        cursor: "pointer",
                      }}
                    >
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleDone(klasse.id, ha.kursId, ha, profile.uid); }}
                        title="Abhaken"
                        style={{
                          width: 19, height: 19, borderRadius: 6, flexShrink: 0, cursor: "pointer",
                          border: `1.5px solid ${t.borderStrong}`, background: "transparent",
                        }}
                      />
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ display: "block", fontSize: 13, color: t.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {ha.text}
                        </span>
                        <span style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 3 }}>
                          {kursChip(ha.kurs)}
                          <span style={{ fontSize: 11, fontWeight: 700, color: ueberfaellig ? t.danger : tage === 0 ? t.warning : t.textFaint }}>
                            {formatDatum(ha.faellig)}
                          </span>
                        </span>
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Kommende Prüfungen */}
          <Card style={{ padding: 16 }}>
            <SectionTitle>Kommende Prüfungen {kommende.length > 0 && <span style={{ color: t.textFaint, fontWeight: 500 }}>({kommende.length})</span>}</SectionTitle>
            {kommende.length === 0 ? (
              <Empty icon={CalendarCheck} text="Keine Prüfungen in Sicht" style={{ padding: "18px 10px" }} />
            ) : (
              <div style={{ display: "grid", gap: 7 }}>
                {kommende.map((pr) => (
                  <div
                    key={`${pr.kursId}-${pr.id}`}
                    onClick={() => navigate(`/kurs/${pr.kursId}`)}
                    style={{
                      display: "flex", alignItems: "center", gap: 9, padding: "9px 11px",
                      background: t.surface2, borderRadius: radius.sm, border: `1px solid ${t.border}`,
                      cursor: "pointer",
                    }}
                  >
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: "block", fontSize: 13, fontWeight: 600, color: t.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {pr.titel}
                      </span>
                      <span style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 3 }}>
                        {kursChip(pr.kurs)}
                        <span style={{ fontSize: 11, color: t.textFaint }}>{formatDatum(pr.datum)}</span>
                      </span>
                    </span>
                    <Pill label={tageLabel(pr.tage)} color={pruefungColor(pr.tage, t)} />
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Neueste Materialien */}
          <Card style={{ padding: 16 }}>
            <SectionTitle>Zuletzt geteilt</SectionTitle>
            {neueste.length === 0 ? (
              <Empty icon={FolderOpen} text="Noch keine Materialien" sub="Öffne einen Kurs und teile das erste!" style={{ padding: "18px 10px" }} />
            ) : (
              <div style={{ display: "grid", gap: 7 }}>
                {neueste.map((mat) => (
                  <div
                    key={`${mat.kursId}-${mat.id}`}
                    onClick={() => navigate(`/kurs/${mat.kursId}`)}
                    style={{
                      display: "flex", alignItems: "center", gap: 10, padding: "9px 11px",
                      background: t.surface2, borderRadius: radius.sm, border: `1px solid ${t.border}`,
                      cursor: "pointer",
                    }}
                  >
                    <DateiIcon typ={mat.dateiTyp} />
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: "block", fontSize: 13, fontWeight: 600, color: t.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {mat.titel}
                      </span>
                      <span style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 3, flexWrap: "wrap" }}>
                        {kursChip(mat.kurs)}
                        <Tag label={mat.typ} bg={`${MAT_COLORS[mat.typ]}1a`} fg={MAT_COLORS[mat.typ]} />
                        <span style={{ fontSize: 11, color: t.textFaint }}>
                          {mat.autor} · {relativeTime(mat.createdAt)}
                        </span>
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
