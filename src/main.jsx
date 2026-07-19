import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import Landing from "./pages/Landing";
import { ThemeProvider } from "./context/ThemeContext";

// Hostname-Routing: app.classsync.de -> App, classsync.de -> Landing.
// Lokal (localhost) läuft die App; ?landing=1 zeigt die Landingpage zur Vorschau.
//
// Vercel-Preview-Deployments (*.vercel.app) sind weder "app.*" noch localhost und
// landen deshalb auf der Landingpage. ?app=1 erzwingt die App und merkt sich das
// pro Origin – sonst ginge der Schalter beim ersten Routenwechsel oder beim Start
// aus dem Homescreen (PWA) wieder verloren. Betrifft nur die Preview-Domain,
// da localStorage pro Origin getrennt ist.
const FORCE_APP_KEY = "classsync_forceApp";
const host = window.location.hostname;
const params = new URLSearchParams(window.location.search);
const isLocal = host === "localhost" || host === "127.0.0.1";
// Auf der echten Domain bleibt es beim reinen Hostname-Routing – sonst könnte
// classsync.de/?app=1 die Marketing-Domain dauerhaft in die App kippen.
const isProdDomain = /(^|\.)classsync\.de$/.test(host);

if (!isProdDomain) {
  if (params.get("app") === "1") localStorage.setItem(FORCE_APP_KEY, "1");
  if (params.get("landing") === "1") localStorage.removeItem(FORCE_APP_KEY);
}
const forceApp = !isProdDomain && localStorage.getItem(FORCE_APP_KEY) === "1";

const isApp =
  (host.startsWith("app.") || isLocal || forceApp) && params.get("landing") !== "1";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ThemeProvider>
      {isApp ? (
        <BrowserRouter>
          <App />
        </BrowserRouter>
      ) : (
        <Landing />
      )}
    </ThemeProvider>
  </React.StrictMode>
);
