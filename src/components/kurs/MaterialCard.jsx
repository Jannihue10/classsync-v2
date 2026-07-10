import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useKlasse } from "../../context/KlasseContext";
import { useTheme } from "../../context/ThemeContext";
import { MAT_COLORS, DATEITYP_ICONS } from "../../lib/faecher";
import { relativeTime } from "../../lib/dates";
import { radius } from "../../styles/theme";
import { Tag } from "../ui/UI";
import ConfirmDialog from "../modals/ConfirmDialog";
import { canDeleteMaterial, deleteMaterial, toggleLike } from "./materialActions";

export default function MaterialCard({ mat, klasseId, kurs, onOpen }) {
  const { t } = useTheme();
  const { profile } = useAuth();
  const { isKlassenAdmin } = useKlasse();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const liked = mat.likes?.includes(profile.uid);
  const likeCount = mat.likes?.length || 0;
  const color = MAT_COLORS[mat.typ] || t.accent;

  return (
    <>
      <div
        onClick={onOpen}
        style={{
          background: t.surface, border: `1px solid ${t.border}`, borderRadius: radius.md,
          overflow: "hidden", cursor: "pointer", boxShadow: t.shadow,
          display: "flex", flexDirection: "column", transition: "border-color .12s, transform .08s",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = t.borderStrong; e.currentTarget.style.transform = "translateY(-1px)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = t.border; e.currentTarget.style.transform = "none"; }}
      >
        {/* Vorschau-Bereich */}
        <div
          style={{
            height: 110, background: `${color}14`, display: "flex",
            alignItems: "center", justifyContent: "center", overflow: "hidden", position: "relative",
          }}
        >
          {mat.dateiTyp === "Bild" && mat.dateiUrl ? (
            <img
              src={mat.dateiUrl}
              alt={mat.titel}
              loading="lazy"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <span style={{ fontSize: 38, opacity: 0.85 }}>{DATEITYP_ICONS[mat.dateiTyp] || "📄"}</span>
          )}
          <div style={{ position: "absolute", top: 8, left: 8 }}>
            <Tag label={mat.typ} bg={`${color}e6`} fg="#fff" />
          </div>
        </div>

        {/* Info */}
        <div style={{ padding: "10px 12px 12px", display: "grid", gap: 6, flex: 1 }}>
          <div
            style={{
              fontSize: 13.5, fontWeight: 700, color: t.text, lineHeight: 1.35,
              display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
            }}
          >
            {mat.titel}
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "auto" }}>
            <span style={{ fontSize: 11.5, color: t.textFaint }}>
              {mat.autor} · {relativeTime(mat.createdAt)}
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 2 }}>
              <button
                onClick={(e) => { e.stopPropagation(); toggleLike(klasseId, kurs.id, mat, profile.uid); }}
                title={liked ? "Danke zurücknehmen" : "Danke sagen"}
                style={{
                  background: "none", border: "none", cursor: "pointer", fontSize: 13,
                  color: liked ? t.star : t.textFaint, fontWeight: 700, padding: "2px 4px",
                  display: "flex", alignItems: "center", gap: 3,
                }}
              >
                {liked ? "⭐" : "☆"} {likeCount > 0 && likeCount}
              </button>
              {canDeleteMaterial(mat, profile.uid, isKlassenAdmin, kurs) && (
                <button
                  onClick={(e) => { e.stopPropagation(); setConfirmDelete(true); }}
                  title="Löschen"
                  style={{
                    background: "none", border: "none", cursor: "pointer",
                    fontSize: 12, color: t.textFaint, padding: "2px 4px",
                  }}
                >
                  🗑️
                </button>
              )}
            </span>
          </div>
        </div>
      </div>

      {confirmDelete && (
        <ConfirmDialog
          title="Material löschen?"
          text={`„${mat.titel}" wird endgültig gelöscht.`}
          onConfirm={() => deleteMaterial(klasseId, kurs.id, mat)}
          onClose={() => setConfirmDelete(false)}
        />
      )}
    </>
  );
}
