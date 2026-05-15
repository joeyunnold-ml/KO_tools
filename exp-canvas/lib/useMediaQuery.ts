"use client";

import { useEffect, useState } from "react";

/**
 * Track a CSS media query as boolean React state.
 * Returns false on the server / initial render to avoid hydration mismatches.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia(query);
    setMatches(mq.matches);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [query]);

  return matches;
}

// Tailwind's `md` breakpoint = 768px. Above this, participants get the full
// grid view; below, they get the mobile column-tab layout.
export function useIsTabletPlus(): boolean {
  return useMediaQuery("(min-width: 768px)");
}
