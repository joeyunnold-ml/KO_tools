// Color palette tokens for the exp-canvas tool.
//
// - GROUP_PALETTE: vestigial from happy-if; unused here but kept for shared
//   ResponsePill compatibility.
// - PILL_COLORS: per-participant name pill colors (deterministic by ID hash).
// - ROW_COLORS: per-canvas-row color tokens (Activities, People, Tools, etc).

import type { RowColorKey } from "./types";

export interface GroupPalette {
  name: string;
  bg: string;      // group card background
  border: string;  // border + hover accent
  pill: string;    // subtle pill/chip background inside cards
  text: string;    // label text color (dark tone of the same family)
}

export const GROUP_PALETTE: GroupPalette[] = [
  { name: "yellow",      bg: "#FFFDE6", border: "#FFF599", pill: "#FFFACC", text: "#000F1E" },
  { name: "light-blue",  bg: "#E6F4FA", border: "#B8E1F2", pill: "#B8E1F2", text: "#0C5673" },
  { name: "blue",        bg: "#E8ECF1", border: "#C2CCDA", pill: "#C2CCDA", text: "#1A2D45" },
  { name: "burgundy",    bg: "#F2E8EC", border: "#DCC2CE", pill: "#DCC2CE", text: "#5A1430" },
  { name: "deep-blue",   bg: "#E6E8EB", border: "#B3B9C2", pill: "#B3B9C2", text: "#000F1E" },
  { name: "yellow-warm", bg: "#FFFACC", border: "#FFF599", pill: "#FFF599", text: "#000F1E" },
];

export function paletteFor(index: number): GroupPalette {
  return GROUP_PALETTE[index % GROUP_PALETTE.length];
}

// ---------------------------------------------------------------------------
// Participant pill colors
// ---------------------------------------------------------------------------
// 8 brand-safe pill colors. Each participant gets one deterministically based
// on a hash of their UUID, so:
//   - the same person shows the same color everywhere (lobby / cluster / vote /
//     results), across all viewers' screens
//   - colors survive page refreshes
//   - no client/server coordination required

export interface PillColor {
  bg: string;
  fg: string;
}

export const PILL_COLORS: PillColor[] = [
  { bg: "#FFFF00", fg: "#000F1E" }, // Yellow 500
  { bg: "#D23C68", fg: "#FFFFFF" }, // Rubine Red 500
  { bg: "#234474", fg: "#FFFFFF" }, // Blue 600
  { bg: "#1FA2D1", fg: "#FFFFFF" }, // Light Blue 500
  { bg: "#661F3E", fg: "#FFFFFF" }, // Burgundy 600
  { bg: "#000F1E", fg: "#FFFFFF" }, // Deep Blue 800
  { bg: "#FFEE66", fg: "#000F1E" }, // Yellow 400
  { bg: "#126F92", fg: "#FFFFFF" }, // Light Blue 700
];

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function pillColorForParticipant(participantId: string): PillColor {
  return PILL_COLORS[hashString(participantId) % PILL_COLORS.length];
}

// ---------------------------------------------------------------------------
// Row color tokens (dimensions on the canvas)
// ---------------------------------------------------------------------------
// Each row on the canvas (Activities, People, Tools, Pain Points, Hopes, etc.)
// is color-coded. Stickies within a row take the row's color as their
// background tint, so the canvas reads as scannable colored bands.
//
// All colors map to brand-safe Monstarlab system tints — no decorative use of
// status (green/red) colors.

export interface RowColor {
  bg: string;     // sticky / cell background fill
  border: string; // cell border + row-label accent
  text: string;   // row label + sticky text
  bandBg: string; // row header band background (left column)
}

export const ROW_COLORS: Record<RowColorKey, RowColor> = {
  gray:      { bg: "#F7F7F6", border: "#DAD9D6", text: "#000F1E", bandBg: "#EFF0F0" },
  blue:      { bg: "#E8ECF1", border: "#C2CCDA", text: "#1A2D45", bandBg: "#D6DCE6" },
  burgundy:  { bg: "#F2E8EC", border: "#DCC2CE", text: "#5A1430", bandBg: "#E8D8DE" },
  coral:     { bg: "#FCE8EE", border: "#F6C5D5", text: "#841534", bandBg: "#F6D8E0" },
  lightblue: { bg: "#E6F4FA", border: "#B8E1F2", text: "#0C5673", bandBg: "#D2EBF6" },
  yellow:    { bg: "#FFFDE6", border: "#FFF599", text: "#000F1E", bandBg: "#FFFACC" },
};

export const ROW_COLOR_KEYS: RowColorKey[] = ["gray", "blue", "burgundy", "coral", "lightblue", "yellow"];

export function rowColor(key: RowColorKey): RowColor {
  return ROW_COLORS[key] ?? ROW_COLORS.gray;
}

export const DEFAULT_ROWS: Array<{ label: string; color: RowColorKey; sort_order: number }> = [
  { label: "Activities",  color: "gray",      sort_order: 0 },
  { label: "People",      color: "blue",      sort_order: 1 },
  { label: "Tools",       color: "burgundy",  sort_order: 2 },
  { label: "Pain Points", color: "coral",     sort_order: 3 },
  { label: "Hopes",       color: "lightblue", sort_order: 4 },
];

export const DEFAULT_COLUMNS: Array<{ label: string; sort_order: number }> = [
  { label: "Identify",    sort_order: 0 },
  { label: "Hypothesize", sort_order: 1 },
  { label: "Design",      sort_order: 2 },
  { label: "Build",       sort_order: 3 },
  { label: "Launch",      sort_order: 4 },
  { label: "Analyze",     sort_order: 5 },
  { label: "Productize",  sort_order: 6 },
];
