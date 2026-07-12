import { FileText } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import { DATEITYP_ICONS } from "../../lib/faecher";

// Datei-Typ-Icon (PDF/Bild/Notiz) als Lucide-Glyph
export default function DateiIcon({ typ, size = 17, color, style }) {
  const { t } = useTheme();
  const Icon = DATEITYP_ICONS[typ] || FileText;
  return <Icon size={size} strokeWidth={1.8} color={color || t.textMuted} style={{ flexShrink: 0, ...style }} />;
}
