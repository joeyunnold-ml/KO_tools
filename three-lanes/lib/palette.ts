// Color palette for the Three-Lane Framework tool.
//
// - PILL_COLORS: per-participant name pill colors (deterministic by ID hash),
//   shared with happy-if and exp-canvas.
// - LANE_COLORS: brand-safe tints mapped to Fix/Test/Build lanes. Replaces
//   the PRD's green/blue/purple (green is reserved for status feedback in
//   the Monstarlab system).
// - TEAM_COLORS: distinguishes Monstarlab vs Avis participants in the
//   vote-distribution bars on contested items.

import type { Lane, Team } from "./types";

export interface PillColor {
  bg: string;
  fg: string;
}

export const PILL_COLORS: PillColor[] = [
  { bg: "#FFFF00", fg: "#000F1E" },
  { bg: "#D23C68", fg: "#FFFFFF" },
  { bg: "#234474", fg: "#FFFFFF" },
  { bg: "#1FA2D1", fg: "#FFFFFF" },
  { bg: "#661F3E", fg: "#FFFFFF" },
  { bg: "#000F1E", fg: "#FFFFFF" },
  { bg: "#FFEE66", fg: "#000F1E" },
  { bg: "#126F92", fg: "#FFFFFF" },
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
// Lane colors — Fix It / Test It / Build It
// ---------------------------------------------------------------------------

export interface LaneColor {
  bg: string;      // light tint for cards / cells
  border: string;  // border, hover accent
  text: string;    // label text on light backgrounds
  solid: string;   // saturated color for filled buttons + vote bars
  solidFg: string; // text on the solid color
  label: string;   // short human label
  emoji: string;
}

export const LANE_COLORS: Record<Lane, LaneColor> = {
  fix: {
    bg: "#E6F4FA",
    border: "#B8E1F2",
    text: "#0C5673",
    solid: "#1FA2D1",
    solidFg: "#FFFFFF",
    label: "Fix It",
    emoji: "🔧",
  },
  test: {
    bg: "#FFFDE6",
    border: "#FFF599",
    text: "#000F1E",
    solid: "#FFFF00",
    solidFg: "#000F1E",
    label: "Test It",
    emoji: "🧪",
  },
  build: {
    bg: "#F2E8EC",
    border: "#DCC2CE",
    text: "#5A1430",
    solid: "#741A3D",
    solidFg: "#FFFFFF",
    label: "Build It",
    emoji: "🏗️",
  },
};

export const LANES: Lane[] = ["fix", "test", "build"];

export function laneColor(lane: Lane): LaneColor {
  return LANE_COLORS[lane];
}

// ---------------------------------------------------------------------------
// Team colors (Monstarlab / Avis)
// ---------------------------------------------------------------------------

export const TEAM_COLORS: Record<Team, { bg: string; fg: string; label: string }> = {
  monstarlab: { bg: "#FFFF00", fg: "#000F1E", label: "ML" },
  avis:       { bg: "#D23C68", fg: "#FFFFFF", label: "Avis" },
};

export function teamColor(team: Team) {
  return TEAM_COLORS[team];
}
