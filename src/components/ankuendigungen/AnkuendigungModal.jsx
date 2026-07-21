import { useState } from "react";
import { CalendarClock, Check, ExternalLink, Megaphone, Pencil, Trash2 } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useKlasse } from "../../context/KlasseContext";
import { useTheme } from "../../context/ThemeContext";
import { formatDatum, relativeTime } from "../../lib/dates";
import { deleteAnkuendigung, markGelesen, terminLabel } from "../../lib/ankuendigungActions";
import { radius, vhScaled } from "../../styles/theme";
import { Btn, CloseButton, Modal, Tag } from "../ui/UI";
import DateiIcon from "../ui/DateiIcon";
import ConfirmDialog from "../modals/ConfirmDialog";
import AnkuendigungFormModal from "./AnkuendigungFormModal";

// Vollansicht einer Ankündigung. Vorlage: MaterialPreviewModal (PDF im iframe,
// Bild als img, Download-Link).
//
// queue: im Login-Popup gezeigt -> statt „Schließen" ein „Verstanden"-Button, der
// gelesenVon serverseitig quittiert. rest = Anzahl weiterer ungelesener Ankündigungen.
export default function AnkuendigungModal({ ank, onClose, queue, rest = 0 }) {
  const { t } = useTheme();
  const { profile } = useAuth();
  const { klasse, isKlassenAdmin } = useKlasse();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [bearbeiten, setBearbeiten] = useState(false);
  const [busy, setBusy] = useState(false);

  const istPdf = ank.dateiTyp === "PDF" && ank.dateiUrl;
  const istBild = ank.dateiTyp === "Bild" && ank.dateiUrl;

  async function bestaetigen() {
    setBusy(true);
    try {
      await markGelesen(klasse.id, ank.id, profile.uid);
    } catch {
      // Quittierung ist unkritisch – Popup trotzdem schließen, es kommt sonst nie weg
    }
    onClose();
  }

  // Bearbeiten ersetzt die Detailansicht, statt ein zweites Modal darüberzulegen –
  // gestapelte Modals räumen sich beim Schließen gegenseitig das body-overflow weg.
  if (bearbeiten) {
    return <AnkuendigungFormModal ank={ank} onClose={() => setBearbeiten(false)} />;
  }

  return (
    <Modal width={istPdf ? 900 : 620} onClose={queue ? undefined : onClose} noPad>
      {/* Kopf */}
      <div
        style={{
          padding: "16px 20px", borderBottom: `1px solid ${t.border}`,
          display: "flex", alignItems: "flex-start", gap: 12,
        }}
      >
        <span
          style={{
            width: 34, height: 34, borderRadius: 9, flexShrink: 0,
            background: t.accentSoft, color: t.accent,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <Megaphone size={17} strokeWidth={1.8} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 16.5, fontWeight: 700, color: t.text }}>{ank.titel}</div>
          <div style={{ fontSize: 12, color: t.textMuted, marginTop: 2, display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
            <span>Ankündigung von {ank.autor} · {relativeTime(ank.createdAt)}</span>
            {/* Bearbeitet-Marker wie im Chat: sonst wäre ein geänderter Termin unsichtbar */}
            {ank.editedAt && (
              <span title={`bearbeitet ${relativeTime(ank.editedAt)}`} style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                <Pencil size={10} strokeWidth={2} />
                bearbeitet
              </span>
            )}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
          {isKlassenAdmin && !queue && (
            <>
              <Btn small variant="ghost" onClick={() => setBearbeiten(true)} title="Bearbeiten">
                <Pencil size={14} strokeWidth={1.8} />
              </Btn>
              <Btn small variant="dangerGhost" onClick={() => setConfirmDelete(true)}>
                <Trash2 size={14} strokeWidth={1.8} />
              </Btn>
            </>
          )}
          {!queue && <CloseButton onClick={onClose} />}
        </div>
      </div>

      <div style={{ padding: 20, display: "grid", gap: 16 }}>
        {ank.kursNamen?.length > 0 && (
          <div>
            <Tag label={`Nur für: ${ank.kursNamen.join(", ")}`} bg={t.surface2} fg={t.textMuted} />
          </div>
        )}

        {ank.termin && (
          <div
            style={{
              display: "flex", alignItems: "center", gap: 11, padding: "12px 14px",
              background: t.accentSoft, border: `1px solid ${t.accent}44`, borderRadius: radius.md,
            }}
          >
            <CalendarClock size={17} strokeWidth={1.8} color={t.accent} style={{ flexShrink: 0 }} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: t.text }}>
                {ank.termin.titel || ank.titel}
              </div>
              <div style={{ fontSize: 12.5, color: t.textMuted, marginTop: 1 }}>
                {terminLabel(ank.termin, formatDatum)} · steht im Kalender
              </div>
            </div>
          </div>
        )}

        {ank.text && (
          <p style={{ margin: 0, fontSize: 14, color: t.text, lineHeight: 1.65, whiteSpace: "pre-wrap" }}>
            {ank.text}
          </p>
        )}

        {istBild && (
          <img
            src={ank.dateiUrl}
            alt={ank.dateiName || ank.titel}
            style={{ maxWidth: "100%", maxHeight: vhScaled(55), borderRadius: radius.sm, display: "block", margin: "0 auto" }}
          />
        )}
        {istPdf && (
          <iframe
            src={ank.dateiUrl}
            title={ank.dateiName || ank.titel}
            style={{ width: "100%", height: vhScaled(55), border: "none", display: "block", background: "#525659", borderRadius: radius.sm }}
          />
        )}

        {ank.dateiUrl && (
          <a href={ank.dateiUrl} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>
            <Btn variant="ghost" small>
              <DateiIcon typ={ank.dateiTyp} size={14} />
              {ank.dateiName || "Datei öffnen"}
              <ExternalLink size={13} strokeWidth={1.8} />
            </Btn>
          </a>
        )}
      </div>

      {queue && (
        <div
          style={{
            padding: "14px 20px", borderTop: `1px solid ${t.border}`,
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
          }}
        >
          <span style={{ fontSize: 12.5, color: t.textMuted }}>
            {rest > 0
              ? `Noch ${rest} weitere ${rest === 1 ? "Ankündigung" : "Ankündigungen"}`
              : 'Du findest sie später unter „Ankündigungen".'}
          </span>
          <Btn onClick={bestaetigen} disabled={busy}>
            <Check size={15} strokeWidth={2} /> {busy ? "Moment…" : "Verstanden"}
          </Btn>
        </div>
      )}

      {confirmDelete && (
        <ConfirmDialog
          title="Ankündigung löschen?"
          text={`„${ank.titel}" wird für alle endgültig gelöscht – inklusive Anhang und Termin.`}
          onConfirm={async () => {
            await deleteAnkuendigung(klasse.id, ank);
            onClose();
          }}
          onClose={() => setConfirmDelete(false)}
        />
      )}
    </Modal>
  );
}
