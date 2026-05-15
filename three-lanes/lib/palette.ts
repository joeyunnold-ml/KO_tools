// Color palette for the Three-Lane Framework tool.
//
// - PILL_COLORS: per-participant name pill colors (deterministic by ID hash),
//   shared with happy-if and exp-canvas.
// - LANE_COLORS: brand-safe tints mapped to Fix/Test/Build lanes. Replaces
//   the PRD's green/blue/purple (green is reserved for status feedback in
//   the Monstarlab system).
// - TEAM_COLORS: distinguishes Monstarlab vs Avis participants in the
//   vote-distribution bars on contested items.

import type { Framing, Lane, LaneSessionRow, Team } from "./types";

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
// Framing presets + label resolution
// ---------------------------------------------------------------------------
// The three lanes are stable internally ('fix'/'test'/'build') so historical
// classifications and votes remain consistent. The DISPLAY label + description
// for each lane come from the session row, populated from one of these presets
// (or fully custom) when the facilitator sets up the session.

export interface LanePreset {
  framing: Framing;
  name: string;
  description: string; // shown on the framing radio's description line
  lanes: Record<Lane, { label: string; description: string }>;
}

export const FRAMING_PRESETS: LanePreset[] = [
  {
    framing: "product",
    name: "Product / Experience",
    description: "Default. Sort UX issues, experiments, and feature work.",
    lanes: {
      fix: {
        label: "Fix It",
        description:
          "Known defects or UX issues with a clear right answer. No hypothesis needed, just fix it.",
      },
      test: {
        label: "Test It",
        description:
          "Genuine hypotheses where the outcome is uncertain. Needs an experiment to decide.",
      },
      build: {
        label: "Build It",
        description:
          "New features or structural changes that need product planning and development investment.",
      },
    },
  },
  {
    framing: "operations",
    name: "Operations / Process",
    description: "Sort process changes by effort and structural commitment.",
    lanes: {
      fix: {
        label: "Just Do It",
        description:
          "A quick process change we can implement this week. Low risk, clear improvement.",
      },
      test: {
        label: "Pilot It",
        description:
          "Try it for a sprint or two and evaluate. We think it'll help but want to see it in practice first.",
      },
      build: {
        label: "Redesign It",
        description:
          "Requires structural change — new tooling, new roles, or organizational commitment. Needs a plan.",
      },
    },
  },
  {
    framing: "custom",
    name: "Custom",
    description: "Define your own three categories.",
    lanes: {
      fix: { label: "", description: "" },
      test: { label: "", description: "" },
      build: { label: "", description: "" },
    },
  },
];

export function getFramingPreset(framing: Framing): LanePreset {
  return FRAMING_PRESETS.find((p) => p.framing === framing) ?? FRAMING_PRESETS[0];
}

/** Lane info resolved against a session — color + dynamic label + description. */
export interface LaneInfo extends LaneColor {
  label: string;
  description: string;
}

/** Returns an indexed lane info object for the session's current framing. */
export function getLaneInfo(
  session: LaneSessionRow | null,
): Record<Lane, LaneInfo> {
  const c = LANE_COLORS;
  const defaults = FRAMING_PRESETS[0].lanes;
  return {
    fix: {
      ...c.fix,
      label: session?.lane_a_label ?? defaults.fix.label,
      description: session?.lane_a_description ?? defaults.fix.description,
    },
    test: {
      ...c.test,
      label: session?.lane_b_label ?? defaults.test.label,
      description: session?.lane_b_description ?? defaults.test.description,
    },
    build: {
      ...c.build,
      label: session?.lane_c_label ?? defaults.build.label,
      description: session?.lane_c_description ?? defaults.build.description,
    },
  };
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
