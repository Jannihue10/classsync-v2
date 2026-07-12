import { useMemo, useState } from "react";
import { FolderOpen, SearchX, Upload } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import { MAT_TYPEN, MAT_COLORS } from "../../lib/faecher";
import { useKursCollection, tsMillis } from "../../lib/useKursCollection";
import { radius } from "../../styles/theme";
import { Btn, Empty, Spinner } from "../ui/UI";
import MaterialCard from "./MaterialCard";
import MaterialPreviewModal from "./MaterialPreviewModal";
import UploadModal from "./UploadModal";

// Primäre Fläche der KursPage: Materialien mit Typ-Filter, Suche und Upload
export default function MaterialGrid({ klasseId, kurs }) {
  const { t } = useTheme();
  const { docs: materialien, loading } = useKursCollection(klasseId, kurs.id, "materialien");
  const [filter, setFilter] = useState("Alle");
  const [search, setSearch] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [previewId, setPreviewId] = useState(null);

  const sorted = useMemo(
    () => [...materialien].sort((a, b) => tsMillis(b.createdAt) - tsMillis(a.createdAt)),
    [materialien]
  );

  const filtered = useMemo(() => {
    let list = sorted;
    if (filter !== "Alle") list = list.filter((m) => m.typ === filter);
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (m) =>
          m.titel.toLowerCase().includes(q) ||
          (m.beschreibung || "").toLowerCase().includes(q) ||
          (m.autor || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [sorted, filter, search]);

  const counts = useMemo(() => {
    const c = { Alle: sorted.length };
    for (const typ of MAT_TYPEN) c[typ] = sorted.filter((m) => m.typ === typ).length;
    return c;
  }, [sorted]);

  const preview = previewId ? sorted.find((m) => m.id === previewId) : null;

  return (
    <div>
      {/* Filterleiste + Suche + Upload */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 14 }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", flex: 1 }}>
          {["Alle", ...MAT_TYPEN].map((typ) => {
            const active = filter === typ;
            const color = typ === "Alle" ? t.accent : MAT_COLORS[typ];
            return (
              <button
                key={typ}
                onClick={() => setFilter(typ)}
                style={{
                  padding: "5px 11px", borderRadius: radius.full, fontSize: 12, fontWeight: 700,
                  cursor: "pointer", whiteSpace: "nowrap",
                  background: active ? `${color}22` : t.surface,
                  color: active ? color : t.textMuted,
                  border: `1.5px solid ${active ? color : t.border}`,
                }}
              >
                {typ} {counts[typ] > 0 && <span style={{ opacity: 0.65 }}>{counts[typ]}</span>}
              </button>
            );
          })}
        </div>
        <input
          placeholder="Suchen…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            padding: "7px 12px", borderRadius: radius.full, border: `1px solid ${t.border}`,
            background: t.surface, color: t.text, fontSize: 13, outline: "none", width: 160,
          }}
        />
        <Btn small onClick={() => setUploadOpen(true)}>
          <Upload size={14} strokeWidth={1.9} /> Hochladen
        </Btn>
      </div>

      {loading ? (
        <Spinner center />
      ) : filtered.length === 0 ? (
        <Empty
          icon={sorted.length === 0 ? FolderOpen : SearchX}
          text={sorted.length === 0 ? "Noch keine Materialien" : "Nichts gefunden"}
          sub={
            sorted.length === 0
              ? "Teile die erste Mitschrift, HA-Lösung oder einen Lernzettel mit deinem Kurs!"
              : "Versuche eine andere Suche oder einen anderen Filter."
          }
          action={
            sorted.length === 0 ? (
              <Btn onClick={() => setUploadOpen(true)}>
                <Upload size={15} strokeWidth={1.9} /> Erstes Material hochladen
              </Btn>
            ) : undefined
          }
        />
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))",
            gap: 14,
          }}
        >
          {filtered.map((mat) => (
            <MaterialCard
              key={mat.id}
              mat={mat}
              klasseId={klasseId}
              kurs={kurs}
              onOpen={() => setPreviewId(mat.id)}
            />
          ))}
        </div>
      )}

      {uploadOpen && <UploadModal klasseId={klasseId} kurs={kurs} onClose={() => setUploadOpen(false)} />}
      {preview && (
        <MaterialPreviewModal
          mat={preview}
          klasseId={klasseId}
          kurs={kurs}
          onClose={() => setPreviewId(null)}
        />
      )}
    </div>
  );
}
