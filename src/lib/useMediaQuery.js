import { useEffect, useState } from "react";
import { MOBILE_BREAKPOINT, WIDE_BREAKPOINT } from "../styles/theme";

export function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = (e) => setMatches(e.matches);
    mql.addEventListener("change", onChange);
    setMatches(mql.matches);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);
  return matches;
}

export function useIsMobile() {
  return useMediaQuery(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
}

export function useIsTablet() {
  return useMediaQuery(
    `(min-width: ${MOBILE_BREAKPOINT}px) and (max-width: ${WIDE_BREAKPOINT - 1}px)`
  );
}

export function useIsWide() {
  return useMediaQuery(`(min-width: ${WIDE_BREAKPOINT}px)`);
}
