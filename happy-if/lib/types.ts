export type Phase = "lobby" | "submit" | "cluster" | "vote" | "complete";
export type Team = "monstarlab" | "avis";

export interface SessionRow {
  id: string;
  room_code: string;
  phase: Phase;
  facilitator_token: string;
  created_at: string;
}

export interface ParticipantRow {
  id: string;
  session_id: string;
  name: string;
  team: Team;
  is_facilitator: boolean;
  connected: boolean;
  joined_at: string;
}

export interface GroupRow {
  id: string;
  session_id: string;
  label: string;
  sort_order: number;
}

export interface ResponseRow {
  id: string;
  session_id: string;
  participant_id: string;
  text: string;
  group_id: string | null;
  sort_order: number;
  created_at: string;
}

export interface VoteRow {
  id: string;
  session_id: string;
  participant_id: string;
  group_id: string;
}

export interface Database {
  public: {
    Tables: {
      sessions: { Row: SessionRow; Insert: Partial<SessionRow>; Update: Partial<SessionRow> };
      participants: { Row: ParticipantRow; Insert: Partial<ParticipantRow>; Update: Partial<ParticipantRow> };
      groups: { Row: GroupRow; Insert: Partial<GroupRow>; Update: Partial<GroupRow> };
      responses: { Row: ResponseRow; Insert: Partial<ResponseRow>; Update: Partial<ResponseRow> };
      votes: { Row: VoteRow; Insert: Partial<VoteRow>; Update: Partial<VoteRow> };
    };
  };
}
