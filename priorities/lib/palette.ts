// Minimal palette for the Priority Vote tool — colors are consistent with
// happy-if's vote dots and the other tools' team colors.

import type { Team } from "./types";

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

export function pillColorForParticipant(id: string): PillColor {
  return PILL_COLORS[hashString(id) % PILL_COLORS.length];
}

// Team colors — same as happy-if + three-lanes for cross-tool consistency
export const TEAM_COLORS: Record<Team, { bg: string; fg: string; label: string }> = {
  monstarlab: { bg: "#FFFF00", fg: "#000F1E", label: "ML" },
  avis:       { bg: "#D23C68", fg: "#FFFFFF", label: "Avis" },
};

export function teamColor(team: Team) {
  return TEAM_COLORS[team];
}

// Vote dots / priority accent color
export const VOTE_COLOR = "#000F1E"; // Deep Blue 800
