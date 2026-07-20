import { useState } from "react";
import { CalendarPlus, Check, FileWarning, LogOut, Pencil, Trash2, Users, X } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useKlasse } from "../../context/KlasseContext";
import { useTheme } from "../../context/ThemeContext";
import { MAT_COLORS } from "../../lib/faecher";
import {
  deleteSammlung, leaveSammlung, removeItem, renameSammlung, setSammlungPruefung,
} from "../../lib/sammlungActions";
import { radius } from "../../styles/theme";
import { Btn, CloseButton, Empty, Modal, Tag } from "../ui/UI";
import DateiIcon from "../ui/DateiIcon";
import ConfirmDialog from "../modals/ConfirmDialog";
import MaterialCard from "../kurs/MaterialCard";
import MaterialPreviewModal from "../kurs/MaterialPreviewModal";
import ShareSammlungModal from "./ShareSammlungModal";
import PruefungChip, { isPruefungVerwaist } from "./PruefungChip";
import PruefungSelect from "./PruefungSelect";

// Sammlung öffnen: Material-Grid (live aufgelöst), entfernen, umbenennen, teilen,
// Prüfung verknüpfen, löschen/verlassen.
export default function SammlungDetailModal({ sammlung, liveMatById, pruefungen = [], onClose }) {
  const { t } = useTheme();
  const { profile } = useAuth();
  const { klasse } = useKlasse();

  const istOwner = sammlung.ownerId === profile.uid;
  const [editName, setEditName] = useState(false);
  const [name, setName] = useState(sammlung.name);
  const [shareOpen, setShareOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [previewMat, setPreviewMat] = useState(null);
  const [editPruefung, setEditPruefung] = useState(false);

  const items = sammlung.items || [];
  const geteilt = (sammlung.memberIds || []).length > 1;

  async function saveName() {
    const v = name.trim();
    if (v.length >= 1 && v !== sammlung.name) await renameSammlung(klasse.id, sammlung.id, v);
    setEditName(false);
  }

  async function savePruefung(ref) {
    setEditPruefung(false);
    await setSammlungPruefung(klasse.id, sammlung.id, ref);
  }

  return (
    <Modal width={880} onClose={onClose} noPad>
      {/* Kopf */}
      <div style={{ padding: "16px 20px", borderBottom: `1px solid ${t.border}`, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 180 }}>
          {editName ? (
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && saveName()}
                maxLength={60}
                style={{
                  flex: 1, padding: "7px 11px", borderRadius: radius.sm, border: `1px solid ${t.accent}`,
                  background: t.surface, color: t.text, fontSize: 15, fontWeight: 700, outline: "none",
                }}
              />
              <Btn small onClick={saveName}><Check size={14} strokeWidth={2} /></Btn>
            </div>
          ) : (
            <div style={{ fontSize: 17, fontWeight: 700, color: t.text, display: "flex", alignItems: "center", gap: 9 }}>
              {sammlung.name}
              {istOwner && (
                <button
                  onClick={() => { setName(sammlung.name); setEditName(true); }}
                  title="Umbenennen"
                  style={{ background: "none", border: "none", cursor: "pointer", color: t.textFaint, padding: 2, display: "flex" }}
                >
                  <Pencil size={14} strokeWidth={1.8} />
                </button>
              )}
            </div>
          )}
          <div style={{ fontSize: 12.5, color: t.textMuted, marginTop: 3, display: "flex", alignItems: "center", gap: 6 }}>
            {items.length} {items.length === 1 ? "Material" : "Materialien"}
            {geteilt && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                · <Users size={12} strokeWidth={1.8} /> geteilt · von {sammlung.ownerNick}
              </span>
            )}
          </div>

          {/* Verknüpfte Prüfung – ändern darf nur der Ersteller (s. Firestore-Rule) */}
          <div style={{ marginTop: 7 }}>
            {editPruefung ? (
              <div style={{ display: "flex", gap: 8, alignItems: "center", maxWidth: 420 }}>
                <PruefungSelect
                  autoFocus
                  pruefungen={pruefungen}
                  value={sammlung.pruefung}
                  onChange={savePruefung}
                />
                <Btn small variant="ghost" onClick={() => setEditPruefung(false)}>Fertig</Btn>
              </div>
            ) : sammlung.pruefung ? (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 7, maxWidth: "100%" }}>
                <PruefungChip
                  pruefung={sammlung.pruefung}
                  verwaist={isPruefungVerwaist(sammlung.pruefung, pruefungen)}
                />
                {istOwner && (
                  <button
                    onClick={() => setEditPruefung(true)}
                    title="Prüfung ändern"
                    style={{ background: "none", border: "none", cursor: "pointer", color: t.textFaint, padding: 2, display: "flex" }}
                  >
                    <Pencil size={12.5} strokeWidth={1.8} />
                  </button>
                )}
              </span>
            ) : istOwner ? (
              <Btn small variant="ghost" onClick={() => setEditPruefung(true)}>
                <CalendarPlus size={13} strokeWidth={1.8} /> Prüfung verknüpfen
              </Btn>
            ) : null}
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {istOwner && (
            <>
              <Btn small variant="ghost" onClick={() => setShareOpen(true)}>
                <Users size={14} strokeWidth={1.8} /> Teilen
              </Btn>
              <Btn small variant="dangerGhost" onClick={() => setDeleteOpen(true)}>
                <Trash2 size={14} strokeWidth={1.8} />
              </Btn>
            </>
          )}
          {!istOwner && (
            <Btn small variant="ghost" onClick={() => setLeaveOpen(true)}>
              <LogOut size={14} strokeWidth={1.8} /> Verlassen
            </Btn>
          )}
          <CloseButton onClick={onClose} />
        </div>
      </div>

      {/* Inhalt */}
      <div style={{ padding: 20 }}>
        {items.length === 0 ? (
          <Empty
            icon={FileWarning}
            text="Noch leer"
            sub="Füge Materialien über das Lesezeichen-Symbol in der Bibliothek hinzu."
          />
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 14 }}>
            {items.map((it) => {
              const mat = liveMatById[it.matId];
              if (mat) {
                return (
                  <div key={it.matId} style={{ position: "relative" }}>
                    <button
                      onClick={() => removeItem(klasse.id, sammlung, it.matId)}
                      title="Aus Sammlung entfernen"
                      style={{
                        position: "absolute", top: 6, right: 6, zIndex: 2,
                        width: 24, height: 24, borderRadius: 999, cursor: "pointer",
                        background: t.overlay, border: "none", color: "#fff",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}
                    >
                      <X size={13} strokeWidth={2.2} />
                    </button>
                    <MaterialCard
                      mat={mat}
                      klasseId={klasse.id}
                      kurs={mat.kurs}
                      showKurs
                      onOpen={() => setPreviewMat(mat)}
                    />
                  </div>
                );
              }
              // Material nicht mehr verfügbar (gelöscht oder Kurs verlassen)
              const color = MAT_COLORS[it.typ] || t.textFaint;
              return (
                <div
                  key={it.matId}
                  style={{
                    position: "relative", border: `1px dashed ${t.borderStrong}`, borderRadius: radius.md,
                    padding: 14, background: t.surface2, display: "flex", flexDirection: "column", gap: 8,
                    opacity: 0.85,
                  }}
                >
                  <button
                    onClick={() => removeItem(klasse.id, sammlung, it.matId)}
                    title="Aus Sammlung entfernen"
                    style={{
                      position: "absolute", top: 6, right: 6,
                      width: 24, height: 24, borderRadius: 999, cursor: "pointer",
                      background: t.surfaceHover, border: "none", color: t.textMuted,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}
                  >
                    <X size={13} strokeWidth={2.2} />
                  </button>
                  <DateiIcon typ="Notiz" size={22} color={t.textFaint} />
                  <div style={{ fontSize: 13, fontWeight: 600, color: t.textMuted, lineHeight: 1.35 }}>
                    {it.titel || "Material"}
                  </div>
                  {it.typ && <Tag label={it.typ} bg={`${color}1a`} fg={color} style={{ justifySelf: "start", alignSelf: "start" }} />}
                  <div style={{ fontSize: 11.5, color: t.textFaint }}>Nicht mehr verfügbar</div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {previewMat && (
        <MaterialPreviewModal
          mat={previewMat}
          klasseId={klasse.id}
          kurs={previewMat.kurs}
          onClose={() => setPreviewMat(null)}
        />
      )}
      {shareOpen && <ShareSammlungModal sammlung={sammlung} onClose={() => setShareOpen(false)} />}
      {deleteOpen && (
        <ConfirmDialog
          title="Sammlung löschen?"
          text={`„${sammlung.name}" wird gelöscht. Die Materialien selbst bleiben in ihren Kursen erhalten.`}
          onConfirm={async () => { await deleteSammlung(klasse.id, sammlung.id); onClose(); }}
          onClose={() => setDeleteOpen(false)}
        />
      )}
      {leaveOpen && (
        <ConfirmDialog
          title="Sammlung verlassen?"
          text={`Du wirst aus „${sammlung.name}" entfernt und siehst sie nicht mehr.`}
          confirmLabel="Verlassen"
          onConfirm={async () => { await leaveSammlung(klasse.id, sammlung, profile.uid); onClose(); }}
          onClose={() => setLeaveOpen(false)}
        />
      )}
    </Modal>
  );
}
