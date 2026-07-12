import { useNavigate } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext";
import { WOCHENTAGE, timeToMin, dateToISO } from "../../lib/dates";
import { radius } from "../../styles/theme";

const PX_PER_MIN = 1.15;
const INNER_PAD = 14;
const TIME_COL = 52;

// Wochenraster Mo–Fr mit minutengenauer Positionierung.
// Nur das Raster scrollt (Eltern-Container), die Tages-Header bleiben über sticky fixiert.
// dates: optional 5 Date-Objekte (Kalender-Modus mit Datum + Heute-Highlight)
// pruefungenByISO: optional { "YYYY-MM-DD": [{id, titel, farbe}] }
export default function WeekGrid({ kurse, dates, pruefungenByISO }) {
  const { t } = useTheme();
  const navigate = useNavigate();

  // Alle Blöcke einsammeln
  const bloecke = [];
  for (const kurs of kurse) {
    for (const z of kurs.zeiten || []) {
      const start = timeToMin(z.zeit);
      const ende = timeToMin(z.zeitEnde);
      if (start === null || ende === null || !WOCHENTAGE.includes(z.day)) continue;
      bloecke.push({ kurs, day: z.day, start, ende });
    }
  }

  // Zeitraster dynamisch: früheste Startzeit (auf volle Stunde abgerundet, max 8:00)
  // bis späteste Endzeit + 30 min Puffer (min. 16:00)
  const minStart = bloecke.length ? Math.min(...bloecke.map((b) => b.start)) : 8 * 60;
  const maxEnde = bloecke.length ? Math.max(...bloecke.map((b) => b.ende)) : 15 * 60 + 30;
  const DAY_START = Math.min(Math.floor(minStart / 60) * 60, 8 * 60);
  const DAY_END = Math.max(maxEnde + 30, 16 * 60);
  const minToPx = (min) => INNER_PAD + (min - DAY_START) * PX_PER_MIN;
  const gridHeight = minToPx(DAY_END) + INNER_PAD;

  const stunden = [];
  for (let h = Math.ceil(DAY_START / 60); h * 60 <= DAY_END; h++) stunden.push(h);

  const heuteISO = dateToISO(new Date());

  return (
    <div style={{ minWidth: 640 }}>
      {/* Tages-Header (sticky im scrollenden Eltern-Container) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `${TIME_COL}px repeat(5, 1fr)`,
          position: "sticky",
          top: 0,
          zIndex: 5,
          background: t.bg,
          borderBottom: `1px solid ${t.border}`,
        }}
      >
        <div />
        {WOCHENTAGE.map((tag, i) => {
          const date = dates?.[i];
          const iso = date ? dateToISO(date) : null;
          const istHeute = iso === heuteISO;
          const pruefungen = (iso && pruefungenByISO?.[iso]) || [];
          return (
            <div key={tag} style={{ padding: "8px 6px", textAlign: "center" }}>
              <div
                style={{
                  fontSize: 12.5, fontWeight: 800,
                  color: istHeute ? t.accent : t.textMuted,
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                }}
              >
                {tag}
                {date && (
                  <span
                    style={{
                      fontSize: 11.5, fontWeight: 700,
                      background: istHeute ? t.accent : "transparent",
                      color: istHeute ? t.accentText : t.textFaint,
                      borderRadius: 999, padding: istHeute ? "1px 7px" : 0,
                    }}
                  >
                    {date.getDate()}.{date.getMonth() + 1}.
                  </span>
                )}
              </div>
              {pruefungen.map((pr) => (
                <div
                  key={pr.id}
                  title={pr.titel}
                  style={{
                    marginTop: 3, fontSize: 10.5, fontWeight: 700, color: "#fff",
                    background: pr.farbe, borderRadius: 5, padding: "2px 6px",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}
                >
                  {pr.titel}
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {/* Raster */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `${TIME_COL}px repeat(5, 1fr)`,
          position: "relative",
          height: gridHeight,
        }}
      >
        {/* Zeitspalte + Stundenlinien */}
        <div style={{ position: "relative" }}>
          {stunden.map((h) => (
            <span
              key={h}
              style={{
                position: "absolute", top: minToPx(h * 60) - 7, right: 8,
                fontSize: 10.5, color: t.textFaint, fontWeight: 600,
              }}
            >
              {String(h).padStart(2, "0")}:00
            </span>
          ))}
        </div>

        {WOCHENTAGE.map((tag, i) => {
          const date = dates?.[i];
          const istHeute = date && dateToISO(date) === heuteISO;
          return (
            <div
              key={tag}
              style={{
                position: "relative",
                borderLeft: `1px solid ${t.border}`,
                background: istHeute ? `${t.accent}0a` : "transparent",
              }}
            >
              {stunden.map((h) => (
                <div
                  key={h}
                  style={{
                    position: "absolute", top: minToPx(h * 60), left: 0, right: 0,
                    borderTop: `1px dashed ${t.border}`,
                  }}
                />
              ))}
              {bloecke
                .filter((b) => b.day === tag)
                .map((b, j) => (
                  <button
                    key={`${b.kurs.id}-${j}`}
                    onClick={() => navigate(`/kurs/${b.kurs.id}`)}
                    title={`${b.kurs.name}${b.kurs.raum ? ` · ${b.kurs.raum}` : ""}`}
                    style={{
                      position: "absolute",
                      top: minToPx(b.start),
                      height: Math.max((b.ende - b.start) * PX_PER_MIN, 30),
                      left: 4, right: 4,
                      background: `${b.kurs.farbe}26`,
                      borderLeft: `3px solid ${b.kurs.farbe}`,
                      border: `1px solid ${b.kurs.farbe}44`,
                      borderLeftWidth: 3,
                      borderLeftColor: b.kurs.farbe,
                      borderRadius: radius.sm,
                      padding: "4px 7px",
                      cursor: "pointer",
                      textAlign: "left",
                      overflow: "hidden",
                      display: "flex", flexDirection: "column", gap: 1,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 11.5, fontWeight: 700, color: t.text, lineHeight: 1.25,
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}
                    >
                      {b.kurs.name}
                    </span>
                    <span style={{ fontSize: 10, color: t.textMuted, whiteSpace: "nowrap" }}>
                      {String(Math.floor(b.start / 60)).padStart(2, "0")}:{String(b.start % 60).padStart(2, "0")}
                      –
                      {String(Math.floor(b.ende / 60)).padStart(2, "0")}:{String(b.ende % 60).padStart(2, "0")}
                      {b.kurs.raum ? ` · ${b.kurs.raum}` : ""}
                    </span>
                  </button>
                ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
