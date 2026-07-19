import { useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext";
import { useNotifications } from "../../context/NotificationContext";
import { useIsMobile } from "../../lib/useMediaQuery";
import { PAGE_PAD, safeExtra, safePad, vhScaled } from "../../styles/theme";
import { KURSWAHL_FLAG } from "../../pages/Onboarding";
import Sidebar from "./Sidebar";
import NotificationPanel from "./NotificationPanel";
import MigrationBanner from "./MigrationBanner";
import KurswahlModal from "../modals/KurswahlModal";
import KursFormModal from "../modals/KursFormModal";
import AddKlasseModal from "../modals/AddKlasseModal";
import { Bell, Menu } from "lucide-react";
import { IconButton, LogoMark } from "../ui/UI";
import UebersichtPage from "../../pages/UebersichtPage";
import BibliothekPage from "../../pages/BibliothekPage";
import KalenderPage from "../../pages/KalenderPage";
import KursPage from "../../pages/KursPage";
import ProfilPage from "../../pages/ProfilPage";

export default function AppShell() {
  const { t } = useTheme();
  const isMobile = useIsMobile();
  const { unreadCount } = useNotifications();
  const location = useLocation();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [kursFormOpen, setKursFormOpen] = useState(false);
  const [addKlasseOpen, setAddKlasseOpen] = useState(false);
  const [kurswahlOpen, setKurswahlOpen] = useState(
    () => sessionStorage.getItem(KURSWAHL_FLAG) === "1"
  );

  useEffect(() => {
    if (kurswahlOpen) sessionStorage.removeItem(KURSWAHL_FLAG);
  }, [kurswahlOpen]);

  // Drawer bei Navigation schließen
  useEffect(() => setDrawerOpen(false), [location.pathname]);

  const sidebarProps = {
    onNavigate: () => setDrawerOpen(false),
    onOpenKursForm: () => { setKursFormOpen(true); setDrawerOpen(false); },
    onOpenKurswahl: () => { setKurswahlOpen(true); setDrawerOpen(false); },
    onOpenAddKlasse: () => { setAddKlasseOpen(true); setDrawerOpen(false); },
    onOpenNotifications: () => { setNotifOpen(true); setDrawerOpen(false); },
  };

  return (
    <div style={{ height: vhScaled(100), display: "flex", background: t.bg, overflow: "hidden" }}>
      {!isMobile && <Sidebar {...sidebarProps} />}

      {/* Mobile: Sidebar als Overlay-Drawer */}
      {isMobile && drawerOpen && (
        <div
          onMouseDown={(e) => e.target === e.currentTarget && setDrawerOpen(false)}
          style={{ position: "fixed", inset: 0, background: t.overlay, zIndex: 800, animation: "cs-fadein .15s ease" }}
        >
          <div style={{ height: "100%", width: "fit-content", animation: "cs-slidein-left .2s ease" }}>
            <Sidebar {...sidebarProps} />
          </div>
        </div>
      )}

      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        {isMobile && (
          <header
            style={{
              display: "flex", alignItems: "center", gap: 8, padding: "10px 12px",
              // Safe-Area (Statusleiste / Notch): absorbiert, nicht addiert
              paddingTop: safePad("top", 10),
              paddingLeft: safePad("left", 12),
              paddingRight: safePad("right", 12),
              borderBottom: `1px solid ${t.border}`, background: t.surface, flexShrink: 0,
            }}
          >
            <IconButton title="Menü" onClick={() => setDrawerOpen(true)}>
              <Menu size={18} strokeWidth={1.8} />
            </IconButton>
            <span style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
              <LogoMark size={24} />
              <span style={{ fontWeight: 700, fontSize: 15, color: t.text }}>ClassSync</span>
            </span>
            <IconButton title="Benachrichtigungen" badge={unreadCount} onClick={() => setNotifOpen(true)}>
              <Bell size={17} strokeWidth={1.8} />
            </IconButton>
          </header>
        )}

        <main
          style={{
            flex: 1, overflowY: "auto", minHeight: 0,
            // Desktop/iPad: kein Mobile-Header -> Statusleisten-Abstand hier;
            // Mobile: Header übernimmt den Top-Abstand. Seiten-Insets fürs Querformat.
            // Die Seiten selbst padden bereits 20px (PAGE_PAD) – nur die Differenz
            // ergänzen, sonst stapeln sich Design-Padding und Geräte-Inset.
            paddingTop: isMobile ? 0 : safeExtra("top", PAGE_PAD),
            paddingLeft: isMobile ? safeExtra("left", PAGE_PAD) : 0,
            paddingRight: safeExtra("right", PAGE_PAD),
          }}
        >
          <MigrationBanner />
          <Routes>
            <Route path="/" element={<UebersichtPage />} />
            <Route path="/bibliothek" element={<BibliothekPage />} />
            <Route path="/kalender" element={<KalenderPage />} />
            {/* Alter Menüpunkt zusammengelegt – Bookmarks weiterleiten */}
            <Route path="/stundenplan" element={<Navigate to="/kalender" replace />} />
            <Route path="/kurs/:kursId" element={<KursPage />} />
            <Route path="/profil" element={<ProfilPage onOpenKurswahl={() => setKurswahlOpen(true)} onOpenAddKlasse={() => setAddKlasseOpen(true)} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>

      {notifOpen && <NotificationPanel onClose={() => setNotifOpen(false)} />}
      {kurswahlOpen && <KurswahlModal onClose={() => setKurswahlOpen(false)} />}
      {kursFormOpen && <KursFormModal onClose={() => setKursFormOpen(false)} />}
      {addKlasseOpen && <AddKlasseModal onClose={() => setAddKlasseOpen(false)} />}
    </div>
  );
}
