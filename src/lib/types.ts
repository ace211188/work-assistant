// 資料表與早晚內容的型別。早晚內容（pa_briefs.content）的格式說明見 routines/README.md

export type Urgency = "high" | "medium" | "low";
export type TodoStatus = "open" | "done" | "dropped";

export type Todo = {
  id: number;
  title: string;
  notes: string | null;
  status: TodoStatus;
  category: string | null;
  urgency_ai: Urgency | null;
  urgency_override: Urgency | null;
  urgency_reason: string | null;
  due_date: string | null;
  planned_date: string | null;
  planned_start: string | null;
  planned_end: string | null;
  defer_count: number;
  recurrence_id: number | null;
  created_at: string;
  completed_at: string | null;
};

export type InboxItem = {
  id: number;
  text: string;
  created_at: string;
  processed_at: string | null;
};

export type Thought = {
  id: number;
  date: string;
  format: "question" | "article" | "direction" | "concept";
  topic: string | null;
  title: string;
  body: string;
  why_relevant: string | null;
  question: string | null;
  source_url: string | null;
  feedback: "useful" | "not_useful" | null;
  comment: string | null;
};

// 助理對你寫下的東西給的回饋（每小時的排程寫入）
export type Feedback = {
  id: number;
  source_type: "idea" | "thought_comment" | "reflection" | "discussion";
  source_id: number;
  source_text: string;
  kind: "reply" | "request" | "skip";
  body: string;
  document_title: string | null;
  document: string | null;
  question: string | null;
  action: string | null;
  action_todo_id: number | null;
  dismissed_at: string | null;
  created_at: string;
};

export type CalendarEvent = {
  id: number;
  calendar_name: string | null;
  title: string | null;
  start_at: string;
  end_at: string;
  all_day: boolean;
  involves_me: boolean;
  involves_me_override: boolean | null;
};

export type WorkHour = { id: number; weekday: number; start_time: string; end_time: string };

export type Exception = {
  id: number;
  date: string;
  start_time: string | null;
  end_time: string | null;
  kind: "rest" | "work";
  note: string | null;
};

export type Recurrence = {
  id: number;
  title: string;
  rule: string;
  category: string | null;
  active: boolean;
};

export type Slot = { start: string; end: string; kind: "work" | "rest" };

export type MorningContent = {
  greeting?: string;
  thought_id?: number;
  free_slots?: Slot[];
  top3?: { todo_id: number; slot?: string; reason?: string }[];
  stale?: { todo_id: number; message: string }[];
  ideas?: { inbox_id: number; text: string }[];
};

export type PlanItem = { todo_id: number; start?: string; end?: string; reason?: string };

export type EveningContent = {
  summary?: string;
  done_ids?: number[];
  undone_ids?: number[];
  stale?: { todo_id: number; message: string }[];
  tomorrow?: { date: string; plan: PlanItem[]; free_slots?: Slot[] };
  ask_private?: string;
  reflection_question?: string;
  user_note?: string;
};

// 中午 12:00：整理上午記下的事、重排下午
export type MiddayContent = {
  summary?: string;
  new_todo_ids?: number[];
  ideas?: { inbox_id: number; text: string }[];
  afternoon?: { plan: PlanItem[]; free_slots?: Slot[] };
};

export type Brief<C> = {
  id: number;
  date: string;
  kind: "morning" | "midday" | "evening";
  content: C;
  status: "draft" | "confirmed";
  created_at: string;
};
