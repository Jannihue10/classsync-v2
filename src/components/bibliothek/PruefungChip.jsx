import { CalendarCheck, CalendarX } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import { calcTage, formatDatum, tageLabel } from "../../lib/dates";
import { pruefungColor } from "../kurs/PruefungenSection";
import { Pill } from "../ui/UI";

// Prüft, ob die verknüpfte Prüfung noch existiert. `pruefungen` kommt aus
// useAcrossKurse("pruefungen") – erst wenn dessen ready-Flag steht, ist ein
// Fehlen aussagekräftig (vorher ist die Liste schlicht noch leer).
// Gelöscht und „Kurs verlassen" sind clientseitig nicht unterscheidbar, deshalb
// dieselbe unscharfe Aussage wie beim Material-Fallback.
export function isPruefungVerwaist(pruefung, pruefungen) {
  if (!pruefung?.prId || !pruefungen?.ready) return false;
  return !pruefungen.some((p) => p.id === pruefung.prId);
}

// Anzeige der verknüpften Prüfung einer Sammlung. Rein aus den denormalisierten
// Feldern gespeist, funktioniert also auch, wenn die Prüfung gelöscht wurde.
export default function PruefungChip({ pruefung, compact, verwaist }) {
  const { t } = useTheme();
  if (!pruefung) return null;

  const tage = calcTage(pruefung.datum);
  const vorbei = tage === null || tage < 0;
  const color = verwaist ? t.textFaint : pruefungColor(tage, t);

  return (
    <span
      style={{
        display: "inline-flex", alignItems: "center", gap: 6, minWidth: 0,
        fontSize: compact ? 12 : 12.5, color: t.textMuted,
        opacity: verwaist || vorbei ? 0.65 : 1,
      }}
    >
      {verwaist ? (
        <CalendarX size={compact ? 12 : 13} strokeWidth={1.8} style={{ flexShrink: 0 }} />
      ) : (
        <CalendarCheck size={compact ? 12 : 13} strokeWidth={1.8} style={{ flexShrink: 0 }} />
      )}
      <span
        style={{
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          textDecoration: verwaist ? "line-through" : undefined,
        }}
      >
        {pruefung.titel || "Prüfung"}
        {!compact && pruefung.datum && ` · ${formatDatum(pruefung.datum)}`}
      </span>
      <Pill
        label={verwaist ? "nicht mehr verfügbar" : vorbei ? "vorbei" : tageLabel(tage)}
        color={color}
        style={{ fontSize: 11, padding: "2px 8px", flexShrink: 0 }}
      />
    </span>
  );
}
