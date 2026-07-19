// Design-Tokens für Light/Dark Mode + Layout-Konstanten
// Slate-Neutraltöne mit einem sparsamen, gedeckten Blau-Akzent.

export const SIDEBAR_WIDTH = 264;
export const MOBILE_BREAKPOINT = 768;
export const WIDE_BREAKPOINT = 1200;

export const themes = {
  light: {
    mode: "light",
    bg: "#f6f7f9",
    surface: "#ffffff",
    surface2: "#f4f5f7",
    surfaceHover: "#edeff2",
    sidebarBg: "#fafbfc",
    sidebarActive: "#eaedf1",
    border: "#e2e5ea",
    borderStrong: "#ced3da",
    text: "#1a1d23",
    textMuted: "#565d68",
    textFaint: "#99a0ab",
    accent: "#3b6ea5",
    accentSoft: "#eaf0f6",
    accentText: "#ffffff",
    danger: "#c2453f",
    dangerSoft: "#f9e9e8",
    success: "#2e8a5f",
    successSoft: "#e6f3ec",
    warning: "#a97a14",
    warningSoft: "#f7efdb",
    star: "#b8860b",
    overlay: "rgba(18,20,25,0.45)",
    shadow: "0 1px 2px rgba(20,23,28,0.05), 0 1px 3px rgba(20,23,28,0.06)",
    shadowLg: "0 8px 28px rgba(20,23,28,0.14)",
    chatOwn: "#3b6ea5",
    chatOwnText: "#ffffff",
    chatOther: "#eef0f3",
  },
  dark: {
    mode: "dark",
    bg: "#0f1216",
    surface: "#171b21",
    surface2: "#1c2128",
    surfaceHover: "#222831",
    sidebarBg: "#12161b",
    sidebarActive: "#222831",
    border: "#262c34",
    borderStrong: "#38404b",
    text: "#e6e9ee",
    textMuted: "#9aa3ae",
    textFaint: "#5d6672",
    accent: "#6d9bcf",
    accentSoft: "#1e2c3a",
    accentText: "#0f1216",
    danger: "#dd7a74",
    dangerSoft: "#392022",
    success: "#5cb389",
    successSoft: "#17322a",
    warning: "#d3a749",
    warningSoft: "#362e1a",
    star: "#d3a749",
    overlay: "rgba(0,0,0,0.6)",
    shadow: "0 1px 2px rgba(0,0,0,0.25), 0 1px 3px rgba(0,0,0,0.28)",
    shadowLg: "0 8px 28px rgba(0,0,0,0.45)",
    chatOwn: "#3b6ea5",
    chatOwnText: "#ffffff",
    chatOther: "#222831",
  },
};

export const radius = { sm: 7, md: 10, lg: 14, xl: 18, full: 999 };

// Globale UI-Skalierung (siehe #root { zoom } in index.html).
// "auto" waehlt anhand der Geraetebreite: Tablet -> normal, sonst klein.
export const UI_SCALES = { klein: 1, normal: 1.15, gross: 1.3 };
export const AUTO_TABLET_SCALE = UI_SCALES.normal;

// vh/vw loesen innerhalb des gezoomten #root gegen den UNskalierten Viewport
// auf und werden danach mitskaliert -> ohne Gegenrechnung 15 % zu gross.
export const vhScaled = (n) => `calc(${n}vh / var(--cs-scale, 1))`;

// Seitliches/oberes Padding der Seiten-Container (UebersichtPage, KursPage,
// BibliothekPage, KalenderPage). AppShell rechnet damit die Safe-Area-Differenz
// aus – deshalb hier zentral und nicht als Literal in den Seiten.
export const PAGE_PAD = 20;

// --- Safe-Area (iOS-PWA) ------------------------------------------------
// Geraete-Inset, gegen die UI-Skalierung gerechnet: wo die Notch bzw. der
// Home-Indikator physisch sitzt, aendert sich nicht, wenn die Schrift waechst.
export const safeInset = (side) =>
  `calc(env(safe-area-inset-${side}) / var(--cs-scale, 1))`;

// Fuer Flaechen mit eigenem Padding: mindestens das Design-Padding, mindestens
// das Inset – NICHT die Summe. Sonst faellt der Abstand auf jedem Geraet um
// einen anderen Betrag zu gross aus (iPhone-Notch ~59px, iPad ~24px, Desktop 0).
export const safePad = (side, base) => `max(${base}px, ${safeInset(side)})`;

// Fuer Wrapper, deren Kind bereits `covered`px paddet: nur die Differenz ergaenzen.
export const safeExtra = (side, covered) =>
  `max(0px, calc(${safeInset(side)} - ${covered}px))`;
