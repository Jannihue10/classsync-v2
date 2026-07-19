import { Bell, Calendar, CalendarCheck, FolderOpen, MessageSquare, PenLine } from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { radius, vhScaled } from "../styles/theme";
import { LogoMark } from "../components/ui/UI";

// Auf der echten Domain zeigt die Landingpage auf app.classsync.de. Auf einem
// Vercel-Preview-Deployment würde das aus der Preview heraus in die Produktion
// springen – dort bleiben wir deshalb auf derselben Origin und erzwingen die App
// per ?app=1 (siehe main.jsx).
const IS_PROD_DOMAIN = /(^|\.)classsync\.de$/.test(window.location.hostname);
const APP_URL = IS_PROD_DOMAIN ? "https://app.classsync.de" : `${window.location.origin}/?app=1`;
const REGISTER_URL = IS_PROD_DOMAIN
  ? "https://app.classsync.de/?register=true"
  : `${window.location.origin}/?app=1&register=true`;

const FEATURES = [
  { icon: FolderOpen, title: "Materialien teilen", text: "Mitschriften, HA-Lösungen, Lernzettel und Aufgabenblätter – als PDF, Bild oder Notiz. Für den ganzen Kurs, in Sekunden." },
  { icon: Calendar, title: "Stundenplan & Kalender", text: "Baut sich automatisch aus den Kurszeiten auf. Ein Klick auf die Stunde bringt dich direkt zu den Materialien." },
  { icon: PenLine, title: "Hausaufgaben", text: "Einmal eingetragen, sieht sie der ganze Kurs. Jeder hakt für sich ab – nichts geht mehr unter." },
  { icon: CalendarCheck, title: "Prüfungs-Countdown", text: "Alle Klausuren mit Live-Countdown. Du siehst sofort, was als Nächstes ansteht." },
  { icon: MessageSquare, title: "Kurs-Chat", text: "Ein eigener Chat pro Kurs. Fragen stellen, Antworten bekommen – ohne die Klassengruppe zu fluten." },
  { icon: Bell, title: "Benachrichtigungen", text: "Neue Materialien seit deinem letzten Besuch, übersichtlich nach Kurs gruppiert." },
];

const STEPS = [
  { nr: "1", title: "Klasse erstellen", text: "Registriere dich kostenlos und erstelle deine Klasse. Du bekommst einen 5-stelligen Zugangscode." },
  { nr: "2", title: "Mitschüler einladen", text: "Teile den Code – alle treten in Sekunden bei und wählen ihre Kurse." },
  { nr: "3", title: "Alles teilen", text: "Mitschriften hochladen, Hausaufgaben eintragen, Prüfungen planen. Fertig." },
];

export default function Landing() {
  const { t } = useTheme();

  return (
    <div style={{ background: t.bg, color: t.text, minHeight: vhScaled(100) }}>
      {/* Sticky Nav */}
      <nav
        style={{
          position: "sticky", top: 0, zIndex: 100,
          background: `${t.surface}e6`, backdropFilter: "blur(12px)",
          borderBottom: `1px solid ${t.border}`,
        }}
      >
        <div
          style={{
            maxWidth: 1080, margin: "0 auto", padding: "12px 20px",
            paddingTop: "calc(12px + env(safe-area-inset-top))",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <LogoMark size={32} />
            <span style={{ fontWeight: 700, fontSize: 16.5, letterSpacing: -0.3 }}>ClassSync</span>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <a href={APP_URL} style={btnStyle(t, "ghost")}>Anmelden</a>
            <a href={REGISTER_URL} style={btnStyle(t, "primary")}>Kostenlos starten</a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <header style={{ maxWidth: 860, margin: "0 auto", padding: "88px 20px 72px", textAlign: "center" }}>
        <div
          style={{
            display: "inline-flex", alignItems: "center", gap: 7, padding: "5px 14px",
            borderRadius: 999, background: t.accentSoft, color: t.accent,
            fontSize: 12.5, fontWeight: 600, marginBottom: 22,
          }}
        >
          Kostenlos für Schüler
        </div>
        <h1 style={{ margin: 0, fontSize: "clamp(32px, 6vw, 52px)", fontWeight: 700, letterSpacing: -1.4, lineHeight: 1.12 }}>
          Alles für deine Klasse.
          <br />
          <span style={{ color: t.accent }}>An einem Ort.</span>
        </h1>
        <p style={{ margin: "22px auto 0", maxWidth: 560, fontSize: 17, color: t.textMuted, lineHeight: 1.6 }}>
          Mitschriften, Hausaufgaben, Lernzettel und Prüfungstermine – teile Unterrichtsmaterial
          mit deiner Klasse, organisiert nach Kursen und Stundenplan.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 34, flexWrap: "wrap" }}>
          <a href={REGISTER_URL} style={{ ...btnStyle(t, "primary"), padding: "13px 28px", fontSize: 15 }}>
            Kostenlos starten
          </a>
          <a href={APP_URL} style={{ ...btnStyle(t, "ghost"), padding: "13px 28px", fontSize: 15 }}>
            Ich habe schon ein Konto
          </a>
        </div>
        <p style={{ marginTop: 18, fontSize: 12.5, color: t.textFaint }}>
          Läuft im Browser · Installierbar auf iPad & Handy · Keine Werbung
        </p>
      </header>

      {/* Features */}
      <section style={{ maxWidth: 1080, margin: "0 auto", padding: "20px 20px 70px" }}>
        <h2 style={{ textAlign: "center", fontSize: 27, fontWeight: 700, letterSpacing: -0.5, margin: "0 0 36px" }}>
          Alles, was deine Klasse braucht
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
          {FEATURES.map((f) => (
            <div
              key={f.title}
              style={{
                background: t.surface, border: `1px solid ${t.border}`, borderRadius: radius.lg,
                padding: "24px 22px", boxShadow: t.shadow,
              }}
            >
              <span
                style={{
                  width: 40, height: 40, borderRadius: radius.sm, marginBottom: 14,
                  background: t.accentSoft, color: t.accent,
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                }}
              >
                <f.icon size={19} strokeWidth={1.8} />
              </span>
              <h3 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 700 }}>{f.title}</h3>
              <p style={{ margin: 0, fontSize: 14, color: t.textMuted, lineHeight: 1.6 }}>{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 3 Schritte */}
      <section style={{ background: t.surface, borderTop: `1px solid ${t.border}`, borderBottom: `1px solid ${t.border}` }}>
        <div style={{ maxWidth: 1080, margin: "0 auto", padding: "60px 20px" }}>
          <h2 style={{ textAlign: "center", fontSize: 27, fontWeight: 700, letterSpacing: -0.5, margin: "0 0 36px" }}>
            In 3 Schritten startklar
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 24 }}>
            {STEPS.map((s) => (
              <div key={s.nr} style={{ textAlign: "center", padding: "0 10px" }}>
                <div
                  style={{
                    width: 44, height: 44, borderRadius: 999, margin: "0 auto 14px",
                    background: t.accent, color: t.accentText,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 18, fontWeight: 700,
                  }}
                >
                  {s.nr}
                </div>
                <h3 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 700 }}>{s.title}</h3>
                <p style={{ margin: 0, fontSize: 14, color: t.textMuted, lineHeight: 1.6 }}>{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ maxWidth: 720, margin: "0 auto", padding: "70px 20px", textAlign: "center" }}>
        <h2 style={{ fontSize: 28, fontWeight: 700, letterSpacing: -0.5, margin: "0 0 14px" }}>
          Bereit für entspanntere Schultage?
        </h2>
        <p style={{ margin: "0 0 28px", fontSize: 15.5, color: t.textMuted }}>
          Erstelle deine Klasse in unter einer Minute – kostenlos.
        </p>
        <a href={REGISTER_URL} style={{ ...btnStyle(t, "primary"), padding: "14px 32px", fontSize: 15.5 }}>
          Jetzt kostenlos starten
        </a>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: `1px solid ${t.border}`, padding: "26px 20px", textAlign: "center" }}>
        <p style={{ margin: 0, fontSize: 12.5, color: t.textFaint }}>
          ClassSync · Von Schülern, für Schüler · {new Date().getFullYear()}
        </p>
      </footer>
    </div>
  );
}

function btnStyle(t, variant) {
  const base = {
    display: "inline-block", padding: "9px 18px", borderRadius: radius.sm,
    fontSize: 13.5, fontWeight: 600, textDecoration: "none", whiteSpace: "nowrap",
  };
  if (variant === "primary") {
    return { ...base, background: t.accent, color: t.accentText };
  }
  return { ...base, background: "transparent", color: t.text, border: `1px solid ${t.borderStrong}` };
}
