import { useAuth } from "../../context/AuthContext";
import { Modal, ModalHeader } from "../ui/UI";
import KlasseForm from "./KlasseForm";

// Weitere Klasse hinzufügen (beitreten oder erstellen), während man bereits Mitglied ist.
// Nutzt dasselbe Formular wie das Onboarding. Nach Erfolg wird die neue Klasse aktiv –
// der klassen-skopierte Baum remountet, das Modal verschwindet dabei.
export default function AddKlasseModal({ onClose }) {
  const { profile } = useAuth();
  return (
    <Modal width={440} onClose={onClose}>
      <ModalHeader
        title="Klasse hinzufügen"
        subtitle="Tritt einer weiteren Klasse bei oder erstelle eine neue."
        onClose={onClose}
      />
      <KlasseForm uid={profile.uid} onDone={onClose} />
    </Modal>
  );
}
