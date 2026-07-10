import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import Landing from "./pages/Landing";
import { ThemeProvider } from "./context/ThemeContext";

// Hostname-Routing: app.classsync.de -> App, classsync.de -> Landing.
// Lokal (localhost) läuft die App; ?landing=1 zeigt die Landingpage zur Vorschau.
const host = window.location.hostname;
const params = new URLSearchParams(window.location.search);
const isLocal = host === "localhost" || host === "127.0.0.1";
const isApp = (host.startsWith("app.") || isLocal) && params.get("landing") !== "1";

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
