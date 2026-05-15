export type Phase = "setup" | "lobby" | "capture" | "vote" | "assign" | "complete";
export type Team = "monstarlab" | "avis";

export interface VoteSessionRow {
  id: string;
  room_code: string;
  phase: Phase;
  capture_enabled: boolean;
  votes_per_person: number;
  facilitator_token: string;
  created_at: string;
}

export interface VoteParticipantRow {
  id: string;
  session_id: string;
  name: string;
  team: Team;
  is_facilitator: boolean;
  joined_at: string;
}

export interface VotePriorityRow {
  id: string;
  session_id: string;
  title: string;
  description: string | null;
  is_preloaded: boolean;
  submitted_by: string | null;
  accepted: boolean;
  access_needed: string | null;
  ml_owner: string | null;
  avis_counterpart: string | null;
  first_action: string | null;
  final_rank: number | null;
  sort_order: number;
  created_at: string;
}

export interface PriorityVoteRow {
  id: string;
  session_id: string;
  priority_id: string;
  participant_id: string;
}
