import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  CalendarCheck, CircleOff, Clock, FolderOpen, MapPin, MessageSquare,
  Pencil, PenLine, Plus, Trash2, User, Users,
} from "lucide-react";
import CourseAvatar from "../components/ui/CourseAvatar";
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
import KursMitgliederModal from "../components/modals/KursMitgliederModal";
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
  const [membersOpen, setMembersOpen] = useState(false);
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
        icon={CircleOff}
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
        { id: "material", label: "Materialien", icon: FolderOpen },
        { id: "chat", label: "Chat", icon: MessageSquare },
      ]
    : [
        { id: "material", label: "Materialien", icon: FolderOpen },
        { id: "ha", label: "Hausaufgaben", icon: PenLine, badge: offeneHAs },
        { id: "pruefungen", label: "Prüfungen", icon: CalendarCheck, badge: kommendePruefungen },
        { id: "chat", label: "Chat", icon: MessageSquare },
      ];

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto", padding: "20px 20px 40px" }}>
      {/* Kurs-Header */}
      <div
        style={{
          background: t.surface,
          border: `1px solid ${t.border}`,
          borderLeft: `3px solid ${kurs.farbe}`,
          borderRadius: radius.lg,
          padding: "18px 20px",
          display: "flex",
          alignItems: "center",
          gap: 16,
          flexWrap: "wrap",
          marginBottom: 16,
          boxShadow: t.shadow,
        }}
      >
        <CourseAvatar name={kurs.name} farbe={kurs.farbe} size={50} radius={13} />
        <div style={{ flex: 1, minWidth: 200 }}>
          <h1 style={{ margin: 0, fontSize: 21, fontWeight: 700, color: t.text, letterSpacing: -0.4 }}>
            {kurs.name}
          </h1>
          <div style={{ fontSize: 13, color: t.textMuted, marginTop: 4, display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center" }}>
            {kurs.lehrer && <MetaItem icon={User} text={kurs.lehrer} />}
            {kurs.raum && <MetaItem icon={MapPin} text={kurs.raum} />}
            {zeitenText && <MetaItem icon={Clock} text={zeitenText} />}
            <MetaItem icon={Users} text={`${kurs.memberIds?.length || 0} Mitglieder`} />
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {!isMember && (
            <Btn small onClick={() => setKursMembership(klasse.id, kurs.id, profile.uid, true)}>
              <Plus size={14} strokeWidth={2} /> Beitreten
            </Btn>
          )}
          <Btn small variant="ghost" onClick={() => setMembersOpen(true)}>
            <Users size={14} strokeWidth={1.8} /> Mitglieder
          </Btn>
          {canManageKurs(kurs) && (
            <>
              <Btn small variant="ghost" onClick={() => setEditOpen(true)}>
                <Pencil size={13.5} strokeWidth={1.8} /> Bearbeiten
              </Btn>
              <Btn small variant="dangerGhost" onClick={() => setDeleteOpen(true)} aria-label="Kurs löschen">
                <Trash2 size={14} strokeWidth={1.8} />
              </Btn>
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
              fontSize: 13, fontWeight: 600, cursor: "pointer",
              display: "flex", alignItems: "center", gap: 7,
            }}
          >
            <tabDef.icon size={14} strokeWidth={1.8} />
            {tabDef.label}
            {tabDef.badge > 0 && (
              <span
                style={{
                  background: tab === tabDef.id ? "rgba(255,255,255,.25)" : t.dangerSoft,
                  color: tab === tabDef.id ? t.accentText : t.danger,
                  borderRadius: 999, fontSize: 11, fontWeight: 700, padding: "1px 7px",
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
      {membersOpen && <KursMitgliederModal kurs={kurs} onClose={() => setMembersOpen(false)} />}
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

// Meta-Zeile im Kurs-Header (Lehrer, Raum, Zeiten, Mitglieder)
function MetaItem({ icon: Icon, text }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
      <Icon size={13} strokeWidth={1.8} style={{ opacity: 0.75 }} />
      {text}
    </span>
  );
}
