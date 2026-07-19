import { useMemo, useState } from "react";
import { FolderOpen, FolderPlus, Library, Plus, SearchX } from "lucide-react";
import { useKlasse } from "../context/KlasseContext";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { useAcrossKurse } from "../lib/useAcrossKurse";
import { useSammlungen } from "../lib/useSammlungen";
import { tsMillis } from "../lib/useKursCollection";
import { createSammlung } from "../lib/sammlungActions";
import { PAGE_PAD, radius } from "../styles/theme";
import { Btn, Empty, SectionTitle, Spinner } from "../components/ui/UI";
import PageHeader from "../components/layout/PageHeader";
import MaterialCard from "../components/kurs/MaterialCard";
import MaterialPreviewModal from "../components/kurs/MaterialPreviewModal";
import LibraryFilters from "../components/bibliothek/LibraryFilters";
import AddToSammlungModal from "../components/bibliothek/AddToSammlungModal";
import SammlungCard from "../components/bibliothek/SammlungCard";
import SammlungDetailModal from "../components/bibliothek/SammlungDetailModal";

const DEFAULT_FILTERS = { kursIds: new Set(), typ: "Alle", dateiTyp: "", autorId: "", sort: "neu", search: "" };

export default function BibliothekPage() {
  const { t } = useTheme();
  const { profile } = useAuth();
  const { klasse, meineKurse } = useKlasse();
  const materialien = useAcrossKurse("materialien");
  const { meine, geteilt, loading: sammlungenLoading } = useSammlungen();

  const [tab, setTab] = useState("material");
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [previewMat, setPreviewMat] = useState(null);
  const [addMat, setAddMat] = useState(null);
  const [openSammlungId, setOpenSammlungId] = useState(null);
  const [neuBusy, setNeuBusy] = useState(false);

  const onChange = (patch) => setFilters((f) => ({ ...f, ...patch }));

  const liveMatById = useMemo(
    () => Object.fromEntries(materialien.map((m) => [m.id, m])),
    [materialien]
  );

  // Eindeutige Autoren (Klassenmitglieder mit Material)
  const autoren = useMemo(() => {
    const map = new Map();
    for (const m of materialien) if (m.autorId && !map.has(m.autorId)) map.set(m.autorId, m.autor || "Unbekannt");
    return [...map.entries()]
      .map(([autorId, autor]) => ({ autorId, autor }))
      .sort((a, b) => a.autor.localeCompare(b.autor, "de"));
  }, [materialien]);

  const filtered = useMemo(() => {
    let list = materialien;
    if (filters.kursIds.size > 0) list = list.filter((m) => filters.kursIds.has(m.kurs?.id));
    if (filters.typ !== "Alle") list = list.filter((m) => m.typ === filters.typ);
    if (filters.dateiTyp) list = list.filter((m) => m.dateiTyp === filters.dateiTyp);
    if (filters.autorId) list = list.filter((m) => m.autorId === filters.autorId);
    const q = filters.search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (m) =>
          (m.titel || "").toLowerCase().includes(q) ||
          (m.beschreibung || "").toLowerCase().includes(q) ||
          (m.autor || "").toLowerCase().includes(q)
      );
    }
    const sorted = [...list];
    if (filters.sort === "top") {
      sorted.sort((a, b) => (b.likes?.length || 0) - (a.likes?.length || 0) || tsMillis(b.createdAt) - tsMillis(a.createdAt));
    } else if (filters.sort === "alt") {
      sorted.sort((a, b) => tsMillis(a.createdAt) - tsMillis(b.createdAt));
    } else {
      sorted.sort((a, b) => tsMillis(b.createdAt) - tsMillis(a.createdAt));
    }
    return sorted;
  }, [materialien, filters]);

  const openSammlung = [...meine, ...geteilt].find((s) => s.id === openSammlungId) || null;
  const sammlungenCount = meine.length + geteilt.length;

  async function neueSammlung() {
    if (neuBusy) return;
    const name = window.prompt("Name der neuen Sammlung:");
    if (!name || !name.trim()) return;
    setNeuBusy(true);
    try {
      await createSammlung(klasse.id, { name, ownerId: profile.uid, ownerNick: profile.nickname });
    } finally {
      setNeuBusy(false);
    }
  }

  const tabBtn = (key, label, count) => {
    const active = tab === key;
    return (
      <button
        onClick={() => setTab(key)}
        style={{
          padding: "7px 14px", borderRadius: radius.full, fontSize: 13, fontWeight: 600, cursor: "pointer",
          whiteSpace: "nowrap",
          background: active ? t.accent : t.surface,
          color: active ? t.accentText : t.textMuted,
          border: `1px solid ${active ? t.accent : t.border}`,
        }}
      >
        {label}{count > 0 && <span style={{ opacity: 0.7 }}> {count}</span>}
      </button>
    );
  };

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto", padding: `${PAGE_PAD}px ${PAGE_PAD}px 40px` }}>
      <PageHeader
        icon={Library}
        title="Bibliothek"
        subtitle={`${materialien.length} Materialien aus ${meineKurse.length} Kursen`}
      />

      {/* Tab-Umschalter */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {tabBtn("material", "Alle Materialien", materialien.length)}
        {tabBtn("sammlungen", "Sammlungen", sammlungenCount)}
      </div>

      {meineKurse.length === 0 ? (
        <Empty
          icon={Library}
          text="Noch keine Kurse"
          sub={'Tritt Kursen bei oder erstelle welche – dann sammeln sich hier alle Materialien.'}
          style={{ marginTop: 40 }}
        />
      ) : tab === "material" ? (
        <>
          <LibraryFilters meineKurse={meineKurse} autoren={autoren} value={filters} onChange={onChange} />
          {materialien.length === 0 ? (
            <Empty icon={FolderOpen} text="Noch keine Materialien" sub="Öffne einen Kurs und teile das erste Material!" />
          ) : filtered.length === 0 ? (
            <Empty icon={SearchX} text="Nichts gefunden" sub="Passe Suche oder Filter an." />
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 14 }}>
              {filtered.map((mat) => (
                <MaterialCard
                  key={`${mat.kurs?.id}-${mat.id}`}
                  mat={mat}
                  klasseId={klasse.id}
                  kurs={mat.kurs}
                  showKurs
                  onOpen={() => setPreviewMat(mat)}
                  onAddToSammlung={setAddMat}
                />
              ))}
            </div>
          )}
        </>
      ) : (
        /* Sammlungen-Tab */
        <div style={{ display: "grid", gap: 20 }}>
          <div>
            <SectionTitle
              action={
                <Btn small onClick={neueSammlung}>
                  <Plus size={14} strokeWidth={2} /> Neue Sammlung
                </Btn>
              }
            >
              Meine Sammlungen {meine.length > 0 && <span style={{ color: t.textFaint, fontWeight: 500 }}>({meine.length})</span>}
            </SectionTitle>
            {sammlungenLoading ? (
              <Spinner center />
            ) : meine.length === 0 ? (
              <Empty
                icon={FolderPlus}
                text="Noch keine Sammlungen"
                sub={'Bündle Materialien für eine Prüfung – über „Neue Sammlung" oder das Lesezeichen an einem Material.'}
                action={<Btn onClick={neueSammlung}><Plus size={15} strokeWidth={2} /> Sammlung anlegen</Btn>}
              />
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
                {meine.map((s) => (
                  <SammlungCard key={s.id} sammlung={s} onOpen={() => setOpenSammlungId(s.id)} />
                ))}
              </div>
            )}
          </div>

          {geteilt.length > 0 && (
            <div>
              <SectionTitle>Mit mir geteilt <span style={{ color: t.textFaint, fontWeight: 500 }}>({geteilt.length})</span></SectionTitle>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
                {geteilt.map((s) => (
                  <SammlungCard key={s.id} sammlung={s} onOpen={() => setOpenSammlungId(s.id)} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {previewMat && (
        <MaterialPreviewModal
          mat={previewMat}
          klasseId={klasse.id}
          kurs={previewMat.kurs}
          onClose={() => setPreviewMat(null)}
          onAddToSammlung={(m) => { setPreviewMat(null); setAddMat(m); }}
        />
      )}
      {addMat && <AddToSammlungModal mat={addMat} onClose={() => setAddMat(null)} />}
      {openSammlung && (
        <SammlungDetailModal
          sammlung={openSammlung}
          liveMatById={liveMatById}
          onClose={() => setOpenSammlungId(null)}
        />
      )}
    </div>
  );
}
