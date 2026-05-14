// Group color palette — light tints from the Monstarlab design system.
// Used consistently across Cluster, Vote, and Results views so a group's
// identity carries through every phase.

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
