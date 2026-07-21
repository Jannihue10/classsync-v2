import { useState } from "react";
import { useAnkuendigungen } from "../../context/AnkuendigungenContext";
import AnkuendigungModal from "./AnkuendigungModal";

// Zeigt ungelesene Ankündigungen beim App-Start nacheinander als Modal.
// „Verstanden" schreibt gelesenVon (serverseitig, gilt auf allen Geräten) – die
// Ankündigung fällt dann von selbst aus `ungelesene`. Der lokale Set ist nur ein
// Sicherheitsnetz: scheitert der Write, poppt sie sonst sofort wieder auf.
export default function AnkuendigungPopup() {
  const { ungelesene } = useAnkuendigungen();
  const [weggeklickt, setWeggeklickt] = useState(() => new Set());

  const offen = ungelesene.filter((a) => !weggeklickt.has(a.id));
  if (offen.length === 0) return null;

  const [aktuelle, ...rest] = offen;

  return (
    // key erzwingt eine frische Instanz je Ankündigung. Ohne ihn behält das Modal
    // beim Nachrücken seinen busy-State vom „Verstanden"-Klick der vorherigen –
    // der Button bliebe dauerhaft auf „Moment…" und disabled, und weil das
    // Queue-Modal bewusst kein Schließen/Escape/Overlay-Klick hat, käme man nur
    // per Reload wieder heraus.
    <AnkuendigungModal
      key={aktuelle.id}
      ank={aktuelle}
      queue
      rest={rest.length}
      onClose={() => setWeggeklickt((prev) => new Set(prev).add(aktuelle.id))}
    />
  );
}
