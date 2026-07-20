import { useMemo } from "react";
import { useTheme } from "../../context/ThemeContext";
import { calcTage, formatDatum } from "../../lib/dates";
import { pruefungRefFrom } from "../../lib/sammlungActions";
import { radius } from "../../styles/theme";

// Auswahl der Prüfung, für die eine Sammlung gedacht ist.
// pruefungen: über useAcrossKurse("pruefungen") angereichert (mit kurs-Objekt).
// value: die aktuell verknüpfte Referenz { kursId, prId, titel, datum } oder null.
// onChange: bekommt die neue Referenz oder null („Keine Prüfung").
export default function PruefungSelect({ pruefungen, value, onChange, label, autoFocus }) {
  const { t } = useTheme();

  // Nur kommende Prüfungen zur Auswahl – für vergangene sammelt niemand mehr.
  const kommend = useMemo(() => {
    return pruefungen
      .map((p) => ({ ...p, tage: calcTage(p.datum) }))
      .filter((p) => p.tage !== null && p.tage >= 0)
      .sort((a, b) => a.tage - b.tage);
  }, [pruefungen]);

  // Ist eine vergangene oder inzwischen gelöschte Prüfung verknüpft, muss sie als
  // Option auftauchen – sonst springt das Feld stillschweigend auf „Keine Prüfung".
  const verwaist = value?.prId && !kommend.some((p) => p.id === value.prId);

  const selectStyle = {
    width: "100%",
    padding: "9px 10px",
    borderRadius: radius.sm,
    border: `1px solid ${t.borderStrong}`,
    background: t.surface,
    color: t.text,
    fontSize: 13.5,
    outline: "none",
    colorScheme: t.mode,
    cursor: "pointer",
  };

  function handleChange(e) {
    const prId = e.target.value;
    if (!prId) return onChange(null);
    if (prId === value?.prId) return onChange(value);
    onChange(pruefungRefFrom(kommend.find((p) => p.id === prId)));
  }

  return (
    <label style={{ display: "block", width: "100%" }}>
      {label && (
        <span style={{ display: "block", fontSize: 13, fontWeight: 500, color: t.textMuted, marginBottom: 6 }}>
          {label}
        </span>
      )}
      <select autoFocus={autoFocus} value={value?.prId || ""} onChange={handleChange} style={selectStyle}>
        <option value="">Keine Prüfung</option>
        {verwaist && (
          <option value={value.prId}>
            {value.titel || "Prüfung"}
            {value.datum ? ` — ${formatDatum(value.datum)}` : ""}
          </option>
        )}
        {kommend.map((p) => (
          <option key={p.id} value={p.id}>
            {p.kurs?.name ? `${p.kurs.name} · ` : ""}
            {p.titel} — {formatDatum(p.datum)}
          </option>
        ))}
      </select>
      {kommend.length === 0 && !verwaist && (
        <span style={{ display: "block", fontSize: 12, color: t.textFaint, marginTop: 6 }}>
          In deinen Kursen steht keine Prüfung an.
        </span>
      )}
    </label>
  );
}
