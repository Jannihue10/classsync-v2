import { useMemo, useState } from "react";
import { useKlasse } from "../context/KlasseContext";
import { useTheme } from "../context/ThemeContext";
import { useAcrossKurse } from "../lib/useAcrossKurse";
import { dateToISO, getKW, mondayOf, parseDatum } from "../lib/dates";
import { radius } from "../styles/theme";
import WeekGrid from "../components/kalender/WeekGrid";
import PageHeader from "../components/layout/PageHeader";

const MONATE = [
  "Januar", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember",
];

export default function KalenderPage() {
  const { t } = useTheme();
  const { meineKurse } = useKlasse();
  const pruefungen = useAcrossKurse("pruefungen");
  const [view, setView] = useState("woche"); // "woche" | "monat"
  const [weekOffset, setWeekOffset] = useState(0);
  const [monthCursor, setMonthCursor] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  // Prüfungen nach ISO-Datum gruppiert (unterstützt YYYY-MM-DD und DD.MM.YYYY)
  const pruefungenByISO = useMemo(() => {
    const map = {};
    for (const pr of pruefungen) {
      const iso = parseDatum(pr.datum);
      if (!iso) continue;
      (map[iso] ||= []).push({ id: pr.id, titel: pr.titel, farbe: pr.kurs.farbe, kursName: pr.kurs.name });
    }
    return map;
  }, [pruefungen]);

  const weekDates = useMemo(() => {
    const monday = mondayOf(new Date());
    monday.setDate(monday.getDate() + weekOffset * 7);
    return Array.from({ length: 5 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d;
    });
  }, [weekOffset]);

  const toggleStyle = (active) => ({
    padding: "7px 16px", borderRadius: radius.full, fontSize: 13, fontWeight: 700, cursor: "pointer",
    background: active ? t.accent : t.surface,
    color: active ? t.accentText : t.textMuted,
    border: `1px solid ${active ? "transparent" : t.border}`,
  });

  const navBtnStyle = {
    background: t.surface, border: `1px solid ${t.border}`, borderRadius: radius.sm,
    width: 32, height: 32, cursor: "pointer", color: t.text, fontSize: 14, fontWeight: 700,
  };

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto", padding: "20px 20px 40px" }}>
      <PageHeader
        icon="📅"
        title="Kalender"
        action={
          <div style={{ display: "flex", gap: 6 }}>
            <button style={toggleStyle(view === "woche")} onClick={() => setView("woche")}>Woche</button>
            <button style={toggleStyle(view === "monat")} onClick={() => setView("monat")}>Monat</button>
          </div>
        }
      />

      {view === "woche" ? (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <button style={navBtnStyle} onClick={() => setWeekOffset((w) => w - 1)} aria-label="Vorherige Woche">‹</button>
            <button
              style={{ ...navBtnStyle, width: "auto", padding: "0 14px", fontSize: 12.5 }}
              onClick={() => setWeekOffset(0)}
            >
              Heute
            </button>
            <button style={navBtnStyle} onClick={() => setWeekOffset((w) => w + 1)} aria-label="Nächste Woche">›</button>
            <span style={{ fontSize: 13.5, fontWeight: 700, color: t.textMuted }}>
              KW {getKW(weekDates[0])} · {weekDates[0].toLocaleDateString("de-DE")} – {weekDates[4].toLocaleDateString("de-DE")}
            </span>
          </div>
          <div
            style={{
              background: t.surface, border: `1px solid ${t.border}`,
              borderRadius: 14, overflow: "auto", maxHeight: "calc(100vh - 220px)",
            }}
          >
            <WeekGrid kurse={meineKurse} dates={weekDates} pruefungenByISO={pruefungenByISO} />
          </div>
        </>
      ) : (
        <MonatsView
          cursor={monthCursor}
          setCursor={setMonthCursor}
          pruefungenByISO={pruefungenByISO}
          navBtnStyle={navBtnStyle}
        />
      )}
    </div>
  );
}

function MonatsView({ cursor, setCursor, pruefungenByISO, navBtnStyle }) {
  const { t } = useTheme();

  function shift(delta) {
    setCursor(({ year, month }) => {
      const d = new Date(year, month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  }

  // Kalender-Raster: Wochen (Mo-basiert), die den Monat abdecken
  const weeks = useMemo(() => {
    const first = new Date(cursor.year, cursor.month, 1);
    const start = mondayOf(first);
    const rows = [];
    const cur = new Date(start);
    do {
      const week = Array.from({ length: 7 }, () => {
        const d = new Date(cur);
        cur.setDate(cur.getDate() + 1);
        return d;
      });
      rows.push(week);
    } while (cur.getMonth() === cursor.month || (rows.length < 4));
    return rows;
  }, [cursor]);

  const heuteISO = dateToISO(new Date());

  // Legende: Kurse, die in diesem Monat Prüfungen haben
  const legende = useMemo(() => {
    const map = new Map();
    for (const [iso, prs] of Object.entries(pruefungenByISO)) {
      const d = new Date(iso);
      if (d.getFullYear() === cursor.year && d.getMonth() === cursor.month) {
        for (const pr of prs) map.set(pr.kursName, pr.farbe);
      }
    }
    return [...map.entries()];
  }, [pruefungenByISO, cursor]);

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <button style={navBtnStyle} onClick={() => shift(-1)} aria-label="Vorheriger Monat">‹</button>
        <button
          style={{ ...navBtnStyle, width: "auto", padding: "0 14px", fontSize: 12.5 }}
          onClick={() => {
            const d = new Date();
            setCursor({ year: d.getFullYear(), month: d.getMonth() });
          }}
        >
          Heute
        </button>
        <button style={navBtnStyle} onClick={() => shift(1)} aria-label="Nächster Monat">›</button>
        <span style={{ fontSize: 15, fontWeight: 800, color: t.text }}>
          {MONATE[cursor.month]} {cursor.year}
        </span>
      </div>

      <div
        style={{
          background: t.surface, border: `1px solid ${t.border}`,
          borderRadius: 14, overflow: "auto",
        }}
      >
        <div style={{ minWidth: 640 }}>
          {/* Kopfzeile */}
          <div style={{ display: "grid", gridTemplateColumns: "44px repeat(7, 1fr)", borderBottom: `1px solid ${t.border}` }}>
            <div style={{ padding: "8px 4px", fontSize: 10.5, fontWeight: 800, color: t.textFaint, textAlign: "center" }}>KW</div>
            {["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].map((tag) => (
              <div key={tag} style={{ padding: "8px 4px", fontSize: 12, fontWeight: 800, color: t.textMuted, textAlign: "center" }}>
                {tag}
              </div>
            ))}
          </div>

          {weeks.map((week, wi) => (
            <div
              key={wi}
              style={{
                display: "grid", gridTemplateColumns: "44px repeat(7, 1fr)",
                borderBottom: wi < weeks.length - 1 ? `1px solid ${t.border}` : "none",
              }}
            >
              <div
                style={{
                  padding: "8px 4px", fontSize: 11, fontWeight: 700, color: t.textFaint,
                  textAlign: "center", background: t.surface2, display: "flex",
                  alignItems: "flex-start", justifyContent: "center",
                }}
              >
                {getKW(week[0])}
              </div>
              {week.map((day) => {
                const iso = dateToISO(day);
                const imMonat = day.getMonth() === cursor.month;
                const istHeute = iso === heuteISO;
                const prs = pruefungenByISO[iso] || [];
                return (
                  <div
                    key={iso}
                    style={{
                      minHeight: 84, padding: "6px 5px", borderLeft: `1px solid ${t.border}`,
                      opacity: imMonat ? 1 : 0.38,
                      background: istHeute ? `${t.accent}0f` : "transparent",
                    }}
                  >
                    <span
                      style={{
                        display: "inline-flex", alignItems: "center", justifyContent: "center",
                        width: 22, height: 22, borderRadius: 999, fontSize: 11.5, fontWeight: 700,
                        background: istHeute ? t.accent : "transparent",
                        color: istHeute ? t.accentText : t.textMuted,
                      }}
                    >
                      {day.getDate()}
                    </span>
                    <div style={{ display: "grid", gap: 3, marginTop: 3 }}>
                      {prs.map((pr) => (
                        <div
                          key={pr.id}
                          title={`${pr.kursName}: ${pr.titel}`}
                          style={{
                            fontSize: 10.5, fontWeight: 700, color: "#fff", background: pr.farbe,
                            borderRadius: 5, padding: "2px 6px",
                            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                          }}
                        >
                          {pr.titel}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {legende.length > 0 && (
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 12, padding: "0 4px" }}>
          {legende.map(([name, farbe]) => (
            <span key={name} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: t.textMuted, fontWeight: 600 }}>
              <span style={{ width: 10, height: 10, borderRadius: 3, background: farbe }} />
              {name}
            </span>
          ))}
        </div>
      )}
    </>
  );
}
