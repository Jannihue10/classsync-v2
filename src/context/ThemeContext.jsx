import { createContext, useContext, useEffect, useState } from "react";
import { AUTO_TABLET_SCALE, UI_SCALES, themes } from "../styles/theme";
import { useIsTablet } from "../lib/useMediaQuery";

const ThemeContext = createContext(null);

const SCALE_PREFS = ["auto", "klein", "normal", "gross"];

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState(() => {
    const saved = localStorage.getItem("classsync_theme");
    if (saved === "light" || saved === "dark") return saved;
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });

  const [scalePref, setScalePref] = useState(() => {
    const saved = localStorage.getItem("classsync_uiscale");
    return SCALE_PREFS.includes(saved) ? saved : "auto";
  });

  const isTablet = useIsTablet();
  // "auto": nur Tablets vergroessern – Desktop und Handy bleiben bei 1.0.
  const scale = scalePref === "auto"
    ? (isTablet ? AUTO_TABLET_SCALE : 1)
    : UI_SCALES[scalePref];

  useEffect(() => {
    localStorage.setItem("classsync_theme", mode);
    document.body.style.background = themes[mode].bg;
    document.body.style.color = themes[mode].text;
  }, [mode]);

  useEffect(() => {
    localStorage.setItem("classsync_uiscale", scalePref);
    document.documentElement.style.setProperty("--cs-scale", scale);
  }, [scalePref, scale]);

  const toggle = () => setMode((m) => (m === "light" ? "dark" : "light"));

  return (
    <ThemeContext.Provider
      value={{ mode, toggle, t: themes[mode], scale, scalePref, setScalePref }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
