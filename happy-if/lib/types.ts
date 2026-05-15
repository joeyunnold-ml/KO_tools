export type Phase = "lobby" | "submit" | "cluster" | "vote" | "complete";

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
  is_facilitator: boolean;
  connected: boolean;
  joined_at: string;
}

export interface QuestionRow {
  id: string;
  session_id: string;
  text: string;
  sort_order: number;
  created_at: string;
}

export interface GroupRow {
  id: string;
  session_id: string;
  question_id: string | null;
  label: string;
  sort_order: number;
}

export interface ResponseRow {
  id: string;
  session_id: string;
  participant_id: string;
  question_id: string | null;
  text: string;
  summary: string | null;
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
      questions: { Row: QuestionRow; Insert: Partial<QuestionRow>; Update: Partial<QuestionRow> };
      groups: { Row: GroupRow; Insert: Partial<GroupRow>; Update: Partial<GroupRow> };
      responses: { Row: ResponseRow; Insert: Partial<ResponseRow>; Update: Partial<ResponseRow> };
      votes: { Row: VoteRow; Insert: Partial<VoteRow>; Update: Partial<VoteRow> };
    };
  };
}
