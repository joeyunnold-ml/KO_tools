export type Phase = "setup" | "lobby" | "capture" | "sort" | "analyze" | "results" | "complete";
export type Lane = "fix" | "test" | "build";
export type Team = "monstarlab" | "avis";

export interface LaneSessionRow {
  id: string;
  room_code: string;
  phase: Phase;
  capture_enabled: boolean;
  blind_sort_enabled: boolean;
  analysis_result: AnalysisResult | null;
  facilitator_token: string;
  created_at: string;
}

export interface LaneParticipantRow {
  id: string;
  session_id: string;
  name: string;
  team: Team;
  is_facilitator: boolean;
  joined_at: string;
}

export interface LaneItemRow {
  id: string;
  session_id: string;
  title: string;
  description: string | null;
  source: string | null;
  is_preloaded: boolean;
  submitted_by: string | null;
  final_lane: Lane | null;
  sort_order: number;
  created_at: string;
}

export interface LaneClassificationRow {
  id: string;
  session_id: string;
  item_id: string;
  participant_id: string;
  lane: Lane;
}

// ----- AI analysis result -----
export interface ConsensusItem {
  item_id: string;
  lane: Lane;
  agreement_pct: number;
}

export interface ContestedItem {
  item_id: string;
  distribution: { fix: number; test: number; build: number };
  discussion_prompt: string;
}

export interface PatternObservation {
  observation: string;
}

export interface AnalysisResult {
  consensus: ConsensusItem[];
  contested: ContestedItem[];
  patterns: PatternObservation[];
}
