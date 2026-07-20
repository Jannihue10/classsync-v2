import { useEffect, useState } from "react";
import { GraduationCap, User, Users } from "lucide-react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../context/AuthContext";
import { useKlasse } from "../context/KlasseContext";
import { useMemberships } from "../context/MembershipsContext";
import { banFromKlasse, deleteKlasse, leaveKlasse } from "../lib/klasseActions";
import { PAGE_PAD } from "../styles/theme";
import TabBar from "../components/ui/TabBar";
import ConfirmDialog from "../components/modals/ConfirmDialog";
import ChangeEmailModal from "../components/modals/ChangeEmailModal";
import DeleteAccountModal from "../components/modals/DeleteAccountModal";
import MigrateKlasseModal from "../components/modals/MigrateKlasseModal";
import PageHeader from "../components/layout/PageHeader";
import KontoTab from "../components/profil/KontoTab";
import KlassenListe from "../components/profil/KlassenListe";
import AktiveKlasseCard from "../components/profil/AktiveKlasseCard";
import MitgliederListe from "../components/profil/MitgliederListe";
import DangerCard from "../components/profil/DangerCard";

export default function ProfilPage({ onOpenKurswahl, onOpenAddKlasse }) {
  const { profile } = useAuth();
  const { klasse, kurse, isKlassenAdmin } = useKlasse();
  const { myClasses, openMigrations } = useMemberships();

  const [tab, setTab] = useState("konto");
  const [banTarget, setBanTarget] = useState(null);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [migrateOpen, setMigrateOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [emailOpen, setEmailOpen] = useState(false);
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);

  // Klassenmitglieder live
  const [mitglieder, setMitglieder] = useState(null);
  useEffect(() => {
    const q = query(collection(db, "users"), where("klasseIds", "array-contains", klasse.id));
    return onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({ uid: d.id, ...d.data() }));
      list.sort((a, b) => a.nickname.localeCompare(b.nickname, "de"));
      setMitglieder(list);
    });
  }, [klasse.id]);

  const adminIds = klasse.adminIds || [];
  const binIchAdmin = adminIds.includes(profile.uid);
  const letzterAdminIch = binIchAdmin && adminIds.length === 1;

  const tabs = [
    { id: "konto", label: "Konto", icon: User },
    { id: "klassen", label: "Klassen", icon: GraduationCap, badge: openMigrations.length },
    { id: "mitglieder", label: "Mitglieder", icon: Users },
  ];

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: `${PAGE_PAD}px ${PAGE_PAD}px 40px` }}>
      <PageHeader icon={User} title="Profil & Klasse" />

      <TabBar tabs={tabs} active={tab} onChange={setTab} />

      {tab === "konto" && (
        <KontoTab
          onOpenEmail={() => setEmailOpen(true)}
          onOpenDeleteAccount={() => setDeleteAccountOpen(true)}
        />
      )}

      {tab === "klassen" && (
        <div style={{ display: "grid", gap: 16 }}>
          <KlassenListe onOpenAddKlasse={onOpenAddKlasse} />
          <AktiveKlasseCard
            mitgliederCount={mitglieder?.length}
            letzterAdminIch={letzterAdminIch}
            onOpenKurswahl={onOpenKurswahl}
            onMigrate={() => setMigrateOpen(true)}
            onLeave={() => setLeaveOpen(true)}
          />
          {isKlassenAdmin && (
            <DangerCard
              title="Klasse löschen"
              text="Löscht die Klasse mit allen Kursen, Materialien, Hausaufgaben, Prüfungen und Chats – endgültig."
              buttonLabel="Klasse löschen"
              onClick={() => { setDeleteError(""); setDeleteOpen(true); }}
              error={deleteError}
            />
          )}
        </div>
      )}

      {tab === "mitglieder" && (
        <MitgliederListe mitglieder={mitglieder} onBan={setBanTarget} />
      )}

      {deleteOpen && (
        <ConfirmDialog
          title="Klasse endgültig löschen?"
          text={`„${klasse.name}" wird mit allen Kursen und Inhalten unwiderruflich gelöscht. Alle ${mitglieder?.length ?? ""} Mitglieder verlieren den Zugriff.`}
          confirmLabel="Ja, alles löschen"
          onConfirm={async () => {
            try {
              await deleteKlasse(klasse.id);
            } catch (e) {
              // Fehler sichtbar machen (ConfirmDialog schluckt ihn sonst): Code + Meldung
              console.error("Klasse löschen fehlgeschlagen:", e);
              setDeleteError(e?.code ? `${e.code} — ${e.message}` : (e?.message || String(e)));
            }
          }}
          onClose={() => setDeleteOpen(false)}
        />
      )}

      {banTarget && (
        <ConfirmDialog
          title={`${banTarget.nickname} entfernen?`}
          text={`${banTarget.nickname} wird aus der Klasse und allen Kursen entfernt und kann mit dem Code nicht wieder beitreten, bis du die Sperre aufhebst.`}
          confirmLabel="Entfernen & sperren"
          onConfirm={() => banFromKlasse(klasse.id, banTarget, kurse)}
          onClose={() => setBanTarget(null)}
        />
      )}

      {leaveOpen && (
        <ConfirmDialog
          title="Klasse verlassen?"
          text={`Du verlässt „${klasse.name}" und wirst aus all deinen Kursen entfernt. Du kannst später mit dem Code wieder beitreten.`}
          confirmLabel="Klasse verlassen"
          onConfirm={() => leaveKlasse(klasse.id, profile.uid, kurse, binIchAdmin, profile.klasseIds || [], profile.activeKlasseId)}
          onClose={() => setLeaveOpen(false)}
        />
      )}

      {migrateOpen && (
        <MigrateKlasseModal
          klasse={klasse}
          mitglieder={mitglieder}
          myClasses={myClasses}
          onClose={() => setMigrateOpen(false)}
        />
      )}

      {emailOpen && <ChangeEmailModal onClose={() => setEmailOpen(false)} />}

      {deleteAccountOpen && (
        <DeleteAccountModal myClasses={myClasses} onClose={() => setDeleteAccountOpen(false)} />
      )}
    </div>
  );
}
