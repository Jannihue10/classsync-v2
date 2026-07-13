import { useTheme } from "../../context/ThemeContext";
import { MAT_TYPEN, MAT_COLORS } from "../../lib/faecher";
import { radius } from "../../styles/theme";
import CourseAvatar from "../ui/CourseAvatar";

const DATEITYPEN = ["PDF", "Bild", "Notiz"];
const SORTS = [
  { key: "neu", label: "Neueste" },
  { key: "alt", label: "Älteste" },
  { key: "top", label: "Beliebteste" },
];

// Filterleiste der Bibliothek: Suche, Sortierung, Dateityp, Autor, Kurs-Chips, Typ-Pills.
export default function LibraryFilters({ meineKurse, autoren, value, onChange }) {
  const { t } = useTheme();
  const { kursIds, typ, dateiTyp, autorId, sort, search } = value;

  const selectStyle = {
    padding: "7px 10px", borderRadius: radius.sm, border: `1px solid ${t.border}`,
    background: t.surface, color: t.text, fontSize: 13, outline: "none", colorScheme: t.mode,
    cursor: "pointer",
  };

  const toggleKurs = (id) => {
    const next = new Set(kursIds);
    next.has(id) ? next.delete(id) : next.add(id);
    onChange({ kursIds: next });
  };

  return (
    <div style={{ display: "grid", gap: 10, marginBottom: 16 }}>
      {/* Zeile 1: Suche + Selects */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <input
          placeholder="Titel, Beschreibung oder Autor suchen…"
          value={search}
          onChange={(e) => onChange({ search: e.target.value })}
          style={{
            flex: 1, minWidth: 180, padding: "8px 12px", borderRadius: radius.sm,
            border: `1px solid ${t.border}`, background: t.surface, color: t.text, fontSize: 13.5, outline: "none",
          }}
        />
        <select value={sort} onChange={(e) => onChange({ sort: e.target.value })} style={selectStyle}>
          {SORTS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
        <select value={dateiTyp} onChange={(e) => onChange({ dateiTyp: e.target.value })} style={selectStyle}>
          <option value="">Alle Dateitypen</option>
          {DATEITYPEN.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        <select value={autorId} onChange={(e) => onChange({ autorId: e.target.value })} style={selectStyle}>
          <option value="">Alle Mitglieder</option>
          {autoren.map((a) => <option key={a.autorId} value={a.autorId}>{a.autor}</option>)}
        </select>
      </div>

      {/* Zeile 2: Typ-Pills */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {["Alle", ...MAT_TYPEN].map((typOpt) => {
          const active = typ === typOpt;
          const color = typOpt === "Alle" ? t.accent : MAT_COLORS[typOpt];
          return (
            <button
              key={typOpt}
              onClick={() => onChange({ typ: typOpt })}
              style={{
                padding: "5px 11px", borderRadius: radius.full, fontSize: 12, fontWeight: 700,
                cursor: "pointer", whiteSpace: "nowrap",
                background: active ? `${color}22` : t.surface,
                color: active ? color : t.textMuted,
                border: `1.5px solid ${active ? color : t.border}`,
              }}
            >
              {typOpt}
            </button>
          );
        })}
      </div>

      {/* Zeile 3: Kurs-Chips (mehrfach wählbar; keine Auswahl = alle Kurse) */}
      {meineKurse.length > 1 && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          {meineKurse.map((k) => {
            const active = kursIds.has(k.id);
            return (
              <button
                key={k.id}
                onClick={() => toggleKurs(k.id)}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 7, padding: "4px 10px 4px 4px",
                  borderRadius: radius.full, fontSize: 12.5, fontWeight: 600, cursor: "pointer",
                  whiteSpace: "nowrap",
                  background: active ? `${k.farbe}1f` : t.surface,
                  color: active ? k.farbe : t.textMuted,
                  border: `1.5px solid ${active ? k.farbe : t.border}`,
                }}
              >
                <CourseAvatar name={k.name} farbe={k.farbe} size={20} radius={6} />
                {k.name}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
