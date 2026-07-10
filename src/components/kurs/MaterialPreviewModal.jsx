import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useKlasse } from "../../context/KlasseContext";
import { useTheme } from "../../context/ThemeContext";
import { MAT_COLORS, DATEITYP_ICONS } from "../../lib/faecher";
import { relativeTime } from "../../lib/dates";
import { radius } from "../../styles/theme";
import { Btn, Modal, Tag } from "../ui/UI";
import ConfirmDialog from "../modals/ConfirmDialog";
import { canDeleteMaterial, deleteMaterial, toggleLike } from "./materialActions";

// Vollansicht: PDF im iframe, Bild als img, Notiz als Text
export default function MaterialPreviewModal({ mat, klasseId, kurs, onClose }) {
  const { t } = useTheme();
  const { profile } = useAuth();
  const { isKlassenAdmin } = useKlasse();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const liked = mat.likes?.includes(profile.uid);
  const likeCount = mat.likes?.length || 0;
  const color = MAT_COLORS[mat.typ] || t.accent;
  const hasFile = Boolean(mat.dateiUrl);

  return (
    <Modal width={hasFile && mat.dateiTyp === "PDF" ? 900 : 640} onClose={onClose} noPad>
      {/* Kopf */}
      <div
        style={{
          padding: "16px 20px", borderBottom: `1px solid ${t.border}`,
          display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
        }}
      >
        <Tag label={mat.typ} bg={`${color}22`} fg={color} />
        <div style={{ flex: 1, minWidth: 160 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: t.text }}>{mat.titel}</div>
          <div style={{ fontSize: 12, color: t.textMuted, marginTop: 2 }}>
            von {mat.autor} · {relativeTime(mat.createdAt)}
            {mat.dateiName ? ` · ${mat.dateiName}` : ""}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <Btn small variant={liked ? "soft" : "ghost"} onClick={() => toggleLike(klasseId, kurs.id, mat, profile.uid)}>
            <span style={{ color: liked ? t.star : undefined }}>{liked ? "⭐" : "☆"}</span>
            {likeCount > 0 ? likeCount : "Danke"}
          </Btn>
          {hasFile && (
            <a href={mat.dateiUrl} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>
              <Btn small variant="ghost">⬇️ Öffnen</Btn>
            </a>
          )}
          {canDeleteMaterial(mat, profile.uid, isKlassenAdmin, kurs) && (
            <Btn small variant="dangerGhost" onClick={() => setConfirmDelete(true)}>🗑️</Btn>
          )}
          <button
            onClick={onClose}
            aria-label="Schließen"
            style={{
              background: t.surface2, border: "none", borderRadius: 999, width: 30, height: 30,
              cursor: "pointer", color: t.textMuted, fontSize: 14,
            }}
          >
            ✕
          </button>
        </div>
      </div>

      {/* Inhalt */}
      <div style={{ padding: mat.dateiTyp === "PDF" ? 0 : 20 }}>
        {mat.dateiTyp === "PDF" && hasFile && (
          <iframe
            src={mat.dateiUrl}
            title={mat.titel}
            style={{ width: "100%", height: "70vh", border: "none", display: "block", background: "#525659" }}
          />
        )}
        {mat.dateiTyp === "Bild" && hasFile && (
          <img
            src={mat.dateiUrl}
            alt={mat.titel}
            style={{ maxWidth: "100%", maxHeight: "68vh", borderRadius: radius.sm, display: "block", margin: "0 auto" }}
          />
        )}
        {mat.dateiTyp === "Notiz" && (
          <div
            style={{
              background: t.surface2, borderRadius: radius.md, padding: 18,
              fontSize: 14, color: t.text, lineHeight: 1.65, whiteSpace: "pre-wrap",
            }}
          >
            <span style={{ fontSize: 20, display: "block", marginBottom: 8 }}>{DATEITYP_ICONS.Notiz}</span>
            {mat.beschreibung || "Keine Notiz vorhanden."}
          </div>
        )}
        {mat.dateiTyp !== "Notiz" && mat.beschreibung && (
          <p style={{ margin: mat.dateiTyp === "PDF" ? "14px 20px" : "14px 0 0", fontSize: 13.5, color: t.textMuted, lineHeight: 1.6 }}>
            {mat.beschreibung}
          </p>
        )}
      </div>

      {confirmDelete && (
        <ConfirmDialog
          title="Material löschen?"
          text={`„${mat.titel}" wird endgültig gelöscht.`}
          onConfirm={async () => {
            await deleteMaterial(klasseId, kurs.id, mat);
            onClose();
          }}
          onClose={() => setConfirmDelete(false)}
        />
      )}
    </Modal>
  );
}
