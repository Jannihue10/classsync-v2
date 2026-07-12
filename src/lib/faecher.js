// Fächervorlagen (Handoff §13) + Material-Typen.
// Kurse werden als farbige Monogramme dargestellt (CourseAvatar) – Vorlagen
// setzen daher nur Name + Farbe. Typ-/Datei-Icons sind Lucide-Komponenten.
import {
  BookOpen, CircleCheck, ClipboardList, FileText, Image as ImageIcon,
  PenLine, StickyNote,
} from "lucide-react";

export const FACH_VORLAGEN = [
  { name: "Mathematik", farbe: "#6366f1" },
  { name: "Deutsch", farbe: "#f59e0b" },
  { name: "Biologie", farbe: "#10b981" },
  { name: "Englisch", farbe: "#3b82f6" },
  { name: "Chemie", farbe: "#ef4444" },
  { name: "Geschichte", farbe: "#8b5cf6" },
  { name: "Physik", farbe: "#06b6d4" },
  { name: "Französisch", farbe: "#ec4899" },
  { name: "Sport", farbe: "#f97316" },
  { name: "Kunst", farbe: "#14b8a6" },
  { name: "Informatik", farbe: "#3b82f6" },
  { name: "Musik", farbe: "#ec4899" },
  { name: "Geografie", farbe: "#10b981" },
  { name: "Wirtschaft", farbe: "#f59e0b" },
  { name: "Politik & Gesellschaft", farbe: "#8b5cf6" },
  { name: "Religion/Ethik", farbe: "#94a3b8" },
  { name: "Latein", farbe: "#d97706" },
  { name: "Spanisch", farbe: "#ef4444" },
];

export const MAT_TYPEN = ["Mitschrift", "Aufgabenblatt", "HA-Lösung", "Lernzettel"];

export const MAT_COLORS = {
  Mitschrift: "#6366f1",
  Aufgabenblatt: "#f59e0b",
  "HA-Lösung": "#10b981",
  Lernzettel: "#ec4899",
};

// Lucide-Komponenten – Verwendung: const Icon = MAT_ICONS[typ]; <Icon size={16} />
export const MAT_ICONS = {
  Mitschrift: PenLine,
  Aufgabenblatt: ClipboardList,
  "HA-Lösung": CircleCheck,
  Lernzettel: BookOpen,
};

export const DATEITYP_ICONS = { PDF: FileText, Bild: ImageIcon, Notiz: StickyNote };

export const KURS_FARBEN = [
  "#6366f1", "#3b82f6", "#06b6d4", "#10b981", "#14b8a6", "#f59e0b",
  "#f97316", "#ef4444", "#ec4899", "#8b5cf6", "#d97706", "#94a3b8",
];
