import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useKlasse } from "../context/KlasseContext";
import { useTheme } from "../context/ThemeContext";
import { deleteKurs, setKursMembership } from "../lib/klasseActions";
import { calcTage } from "../lib/dates";
import { useKursCollection } from "../lib/useKursCollection";
import { useIsWide } from "../lib/useMediaQuery";
import { radius } from "../styles/theme";
import { Btn, Empty } from "../components/ui/UI";
import KursFormModal from "../components/modals/KursFormModal";
import ConfirmDialog from "../components/modals/ConfirmDialog";
import MaterialGrid from "../components/kurs/MaterialGrid";
import HASection from "../components/kurs/HASection";
import PruefungenSection from "../components/kurs/PruefungenSection";
import ChatPanel from "../components/kurs/ChatPanel";

export default function KursPage() {
  const { kursId } = useParams();
  const navigate = useNavigate();
  const { t } = useTheme();
  const { profile } = useAuth();
  const { klasse, kurse, canManageKurs } = useKlasse();
  const isWide = useIsWide();

  const kurs = kurse.find((k) => k.id === kursId);
  const isMember = kurs?.memberIds?.includes(profile.uid);

  const [rawTab, setTab] = useState("material");
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const { docs: hausaufgaben } = useKursCollection(klasse?.id, kursId, "hausaufgaben");
  const { docs: pruefungen } = useKursCollection(klasse?.id, kursId, "pruefungen");

  const offeneHAs = useMemo(
    () =>
      hausaufgaben.filter(
        (h) => !h.hiddenBy?.includes(profile.uid) && !h.doneBy?.includes(profile.uid)
      ).length,
    [hausaufgaben, profile.uid]
  );
  const kommendePruefungen = useMemo(
    () => pruefungen.filter((p) => (calcTage(p.datum) ?? -1) >= 0).length,
    [pruefungen]
  );

  if (!kurs) {
    return (
      <Empty
        icon="🫥"
        text="Dieser Kurs existiert nicht mehr"
        sub="Er wurde vermutlich gelöscht."
        action={<Btn onClick={() => navigate("/")}>Zur Übersicht</Btn>}
        style={{ marginTop: 60 }}
      />
    );
  }

  const zeitenText = (kurs.zeiten || [])
    .map((z) => `${z.day} ${z.zeit}–${z.zeitEnde}`)
    .join("  ·  ");

  // Auf breiten Screens: Materialien links, HA + Prüfungen rechts, Chat als Tab.
  // Wechselt das Layout auf breit, während ein HA/Prüfungen-Tab aktiv ist -> auf Materialien zurückfallen
  const tab = isWide && (rawTab === "ha" || rawTab === "pruefungen") ? "material" : rawTab;
  const tabs = isWide
    ? [
        { id: "material", label: "📂 Materialien" },
        { id: "chat", label: "💬 Chat" },
      ]
    : [
        { id: "material", label: "📂 Materialien" },
        { id: "ha", label: "📝 Hausaufgaben", badge: offeneHAs },
        { id: "pruefungen", label: "🎯 Prüfungen", badge: kommendePruefungen },
        { id: "chat", label: "💬 Chat" },
      ];

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto", padding: "20px 20px 40px" }}>
      {/* Kurs-Header */}
      <div
        style={{
          background: `linear-gradient(120deg, ${kurs.farbe}26, ${kurs.farbe}0d)`,
          border: `1px solid ${kurs.farbe}33`,
          borderRadius: radius.lg,
          padding: "18px 20px",
          display: "flex",
          alignItems: "center",
          gap: 16,
          flexWrap: "wrap",
          marginBottom: 16,
        }}
      >
        <div
          style={{
            width: 52, height: 52, borderRadius: 14, background: `${kurs.farbe}2e`,
            border: `1px solid ${kurs.farbe}55`, display: "flex", alignItems: "center",
            justifyContent: "center", fontSize: 26, flexShrink: 0,
          }}
        >
          {kurs.icon}
        </div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: t.text, letterSpacing: -0.4 }}>
            {kurs.name}
          </h1>
          <div style={{ fontSize: 13, color: t.textMuted, marginTop: 3, display: "flex", gap: 14, flexWrap: "wrap" }}>
            {kurs.lehrer && <span>👤 {kurs.lehrer}</span>}
            {kurs.raum && <span>📍 {kurs.raum}</span>}
            {zeitenText && <span>🕐 {zeitenText}</span>}
            <span>👥 {kurs.memberIds?.length || 0} Mitglieder</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {!isMember && (
            <Btn small onClick={() => setKursMembership(klasse.id, kurs.id, profile.uid, true)}>
              + Beitreten
            </Btn>
          )}
          {canManageKurs(kurs) && (
            <>
              <Btn small variant="ghost" onClick={() => setEditOpen(true)}>✏️ Bearbeiten</Btn>
              <Btn small variant="dangerGhost" onClick={() => setDeleteOpen(true)}>🗑️</Btn>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16, overflowX: "auto", paddingBottom: 2 }}>
        {tabs.map((tabDef) => (
          <button
            key={tabDef.id}
            onClick={() => setTab(tabDef.id)}
            style={{
              padding: "8px 14px", borderRadius: radius.full, whiteSpace: "nowrap",
              border: `1px solid ${tab === tabDef.id ? "transparent" : t.border}`,
              background: tab === tabDef.id ? t.accent : t.surface,
              color: tab === tabDef.id ? t.accentText : t.textMuted,
              fontSize: 13, fontWeight: 700, cursor: "pointer",
              display: "flex", alignItems: "center", gap: 7,
            }}
          >
            {tabDef.label}
            {tabDef.badge > 0 && (
              <span
                style={{
                  background: tab === tabDef.id ? "rgba(255,255,255,.25)" : t.dangerSoft,
                  color: tab === tabDef.id ? t.accentText : t.danger,
                  borderRadius: 999, fontSize: 11, fontWeight: 800, padding: "1px 7px",
                }}
              >
                {tabDef.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Inhalt */}
      <div style={isWide ? { display: "grid", gridTemplateColumns: "1fr 360px", gap: 18, alignItems: "start" } : undefined}>
        <div style={{ minWidth: 0 }}>
          {tab === "material" && <MaterialGrid klasseId={klasse.id} kurs={kurs} />}
          {tab === "chat" && <ChatPanel klasseId={klasse.id} kurs={kurs} />}
          {!isWide && tab === "ha" && (
            <HASection klasseId={klasse.id} kurs={kurs} hausaufgaben={hausaufgaben} />
          )}
          {!isWide && tab === "pruefungen" && (
            <PruefungenSection klasseId={klasse.id} kurs={kurs} pruefungen={pruefungen} />
          )}
        </div>
        {isWide && (
          <div style={{ display: "grid", gap: 18 }}>
            <HASection klasseId={klasse.id} kurs={kurs} hausaufgaben={hausaufgaben} compact />
            <PruefungenSection klasseId={klasse.id} kurs={kurs} pruefungen={pruefungen} compact />
          </div>
        )}
      </div>

      {editOpen && <KursFormModal kurs={kurs} onClose={() => setEditOpen(false)} />}
      {deleteOpen && (
        <ConfirmDialog
          title="Kurs löschen?"
          text={`„${kurs.name}" wird mit allen Materialien, Hausaufgaben, Prüfungen und dem Chat endgültig gelöscht. Das kann nicht rückgängig gemacht werden.`}
          confirmLabel="Endgültig löschen"
          onConfirm={async () => {
            await deleteKurs(klasse.id, kurs.id);
            navigate("/");
          }}
          onClose={() => setDeleteOpen(false)}
        />
      )}
    </div>
  );
}
