export type Phase = "lobby" | "elicit" | "synthesize" | "structure" | "contribute";

export type RowColorKey = "gray" | "blue" | "burgundy" | "coral" | "lightblue" | "yellow";

export interface CanvasRow {
  id: string;
  room_code: string;
  phase: Phase;
  focused_column_id: string | null;
  synthesis_result: SynthesisResult | null;
  facilitator_token: string;
  created_at: string;
}

export interface CanvasParticipantRow {
  id: string;
  canvas_id: string;
  name: string;
  is_facilitator: boolean;
  joined_at: string;
}

export interface LifecycleSubmissionRow {
  id: string;
  canvas_id: string;
  participant_id: string;
  stages: string[];
  submitted_at: string;
}

export interface CanvasColumnRow {
  id: string;
  canvas_id: string;
  label: string;
  sort_order: number;
}

export interface CanvasRowRow {
  id: string;
  canvas_id: string;
  label: string;
  color: RowColorKey;
  sort_order: number;
}

export interface StickyRow {
  id: string;
  canvas_id: string;
  column_id: string;
  row_id: string;
  participant_id: string;
  text: string;
  highlighted: boolean;
  created_at: string;
}

// AI synthesis result shape
export interface SynthesisStage {
  label: string;
  confidence: "high" | "medium" | "low";
  source_count: number;
}

export interface SynthesisDivergence {
  description: string;
}

export interface SynthesisResult {
  stages: SynthesisStage[];
  narrative: string;
  divergences: SynthesisDivergence[];
}
