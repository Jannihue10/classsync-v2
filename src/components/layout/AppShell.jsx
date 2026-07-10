import { useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext";
import { useNotifications } from "../../context/NotificationContext";
import { useIsMobile } from "../../lib/useMediaQuery";
import { KURSWAHL_FLAG } from "../../pages/Onboarding";
import Sidebar from "./Sidebar";
import NotificationPanel from "./NotificationPanel";
import KurswahlModal from "../modals/KurswahlModal";
import KursFormModal from "../modals/KursFormModal";
import { IconButton } from "../ui/UI";
import UebersichtPage from "../../pages/UebersichtPage";
import StundenplanPage from "../../pages/StundenplanPage";
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
    onOpenNotifications: () => { setNotifOpen(true); setDrawerOpen(false); },
  };

  return (
    <div style={{ height: "100vh", display: "flex", background: t.bg, overflow: "hidden" }}>
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
              borderBottom: `1px solid ${t.border}`, background: t.surface, flexShrink: 0,
            }}
          >
            <IconButton title="Menü" onClick={() => setDrawerOpen(true)}>☰</IconButton>
            <span style={{ fontWeight: 800, fontSize: 15.5, color: t.text, flex: 1 }}>ClassSync</span>
            <IconButton title="Benachrichtigungen" badge={unreadCount} onClick={() => setNotifOpen(true)}>
              🔔
            </IconButton>
          </header>
        )}

        <main style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
          <Routes>
            <Route path="/" element={<UebersichtPage />} />
            <Route path="/stundenplan" element={<StundenplanPage />} />
            <Route path="/kalender" element={<KalenderPage />} />
            <Route path="/kurs/:kursId" element={<KursPage />} />
            <Route path="/profil" element={<ProfilPage onOpenKurswahl={() => setKurswahlOpen(true)} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>

      {notifOpen && <NotificationPanel onClose={() => setNotifOpen(false)} />}
      {kurswahlOpen && <KurswahlModal onClose={() => setKurswahlOpen(false)} />}
      {kursFormOpen && <KursFormModal onClose={() => setKursFormOpen(false)} />}
    </div>
  );
}
