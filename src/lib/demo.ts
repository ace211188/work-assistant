// 本機開發專用的示範資料：網址加 ?demo 時用假資料取代 Supabase，方便截圖檢查畫面。
// 只在 next dev 啟用，正式網站不會用到。
import { taipeiDate } from "./time";

type Row = Record<string, unknown>;

function sampleData(): Record<string, Row[]> {
  const today = taipeiDate();
  const at = (hm: string) => `${today}T${hm}:00+08:00`;
  const now = new Date().toISOString();
  const todo = (id: number, title: string, extra: Row = {}): Row => ({
    id, title, notes: null, status: "open", category: "行政", urgency_ai: "medium", urgency_override: null,
    urgency_reason: null, due_date: null, planned_date: null, planned_start: null, planned_end: null,
    defer_count: 0, recurrence_id: null, created_at: now, completed_at: null, updated_at: now, ...extra,
  });
  return {
    pa_profile: [{ user_id: "demo" }],
    pa_todos: [
      todo(1, "印好適性測驗體驗券", { category: "招生", urgency_ai: "high", due_date: taipeiDate(3), urgency_reason: "週五截止，還要等印刷" }),
      todo(2, "回覆李媽媽試聽時間", { category: "學生家長" }),
      todo(3, "確認 12 月老師排班", { category: "老師", defer_count: 3 }),
      todo(4, "整理老師合約範本", { category: "行政", urgency_ai: "low" }),
      todo(5, "更新官網的暑期課程頁", { category: "招生", urgency_ai: "low" }),
      todo(6, "繳 11 月房租", { category: "財務", status: "done", completed_at: now }),
      todo(7, "訂購節拍器三台", { category: "教學", status: "done", completed_at: now }),
    ],
    pa_inbox: [{ id: 1, text: "下週找美君討論寒假營隊", created_at: now, processed_at: null }],
    pa_thoughts: [{
      id: 1, date: today, format: "question", topic: "經營與領導",
      title: "停止，比開始更難",
      body: "大部分的忙，是因為我們很少決定「不做什麼」。每多一個招生管道、一個客製化的例外，都在吃掉你思考下一步的時間。",
      why_relevant: "這週有 4 件待辦都和招生有關，但多半是在補洞。",
      question: "如果明年招生要翻倍，你現在最該「停止」做的一件事是什麼？",
      source_url: null, feedback: null, comment: null,
    }],
    pa_direction: [{ content: "今年讓序曲的招生不再靠我一個人。" }],
    pa_calendar_events: [
      { id: 1, calendar_name: "協奏曲教室", title: "宇群・鋼琴個別課", start_at: at("14:00"), end_at: at("16:00"), all_day: false, involves_me: true, involves_me_override: null },
      { id: 2, calendar_name: "賦格教室", title: "小提琴團體課", start_at: at("15:00"), end_at: at("16:30"), all_day: false, involves_me: false, involves_me_override: null },
      { id: 3, calendar_name: "前奏曲教室", title: "兒童音感班", start_at: at("17:00"), end_at: at("18:00"), all_day: false, involves_me: false, involves_me_override: null },
    ],
    pa_briefs: [
      {
        id: 1, date: today, kind: "morning", status: "draft", created_at: now,
        content: {
          greeting: "今天下午有一堂你的課，上午和傍晚各有一段空檔。",
          thought_id: 1,
          free_slots: [{ start: "10:00", end: "12:00", kind: "work" }, { start: "16:30", end: "18:00", kind: "work" }],
          top3: [
            { todo_id: 1, slot: "10:00 – 11:00", reason: "週五截止，印刷要兩天，今天一定要送出。" },
            { todo_id: 2, slot: "11:00 – 11:20", reason: "家長昨天就在等回覆。" },
            { todo_id: 3, slot: "16:30 – 17:00", reason: "下週一前要公布。" },
          ],
          stale: [{ todo_id: 3, message: "「確認 12 月老師排班」已經延了 3 次，是卡在誰的時間還沒定嗎？" }],
          ideas: [{ inbox_id: 9, text: "寒假可以辦親子音樂營" }],
        },
      },
      {
        id: 2, date: today, kind: "evening", status: "draft", created_at: now,
        content: {
          summary: "今天完成了兩件事，房租也繳了。體驗券還沒送印，明天上午先處理。",
          undone_ids: [1, 3],
          tomorrow: { date: taipeiDate(1), plan: [{ todo_id: 1, start: "10:00", end: "11:00", reason: "早上精神最好，先處理最急的。" }, { todo_id: 3, start: "11:30", end: "12:00" }] },
          reflection_question: "今天哪個瞬間，讓你覺得做這行是值得的？",
        },
      },
    ],
    pa_work_hours: [
      { id: 1, weekday: 2, start_time: "10:00", end_time: "21:00" }, { id: 2, weekday: 3, start_time: "10:00", end_time: "21:00" },
      { id: 3, weekday: 4, start_time: "13:00", end_time: "21:00" }, { id: 4, weekday: 6, start_time: "09:00", end_time: "18:00" },
    ],
    pa_exceptions: [{ id: 1, date: taipeiDate(2), start_time: null, end_time: null, kind: "rest", note: "家庭日" }],
    pa_recurrences: [{ id: 1, title: "繳房租", rule: "FREQ=MONTHLY;BYMONTHDAY=5", category: "財務", active: true }],
  };
}

class Query implements PromiseLike<{ data: unknown; error: null }> {
  private filters: ((r: Row) => boolean)[] = [];
  private mode: "many" | "one" = "many";
  private max = Infinity;
  private write = false;
  constructor(private rows: Row[]) {}
  select() { return this; }
  order() { return this; }
  or() { return this; }
  limit(n: number) { this.max = n; return this; }
  eq(k: string, v: unknown) { this.filters.push((r) => r[k] === v); return this; }
  is(k: string, v: unknown) { this.filters.push((r) => (r[k] ?? null) === v); return this; }
  gte(k: string, v: string) { this.filters.push((r) => String(r[k]) >= v); return this; }
  lte(k: string, v: string) { this.filters.push((r) => String(r[k]) <= v); return this; }
  maybeSingle() { this.mode = "one"; return this; }
  single() { this.mode = "one"; return this; }
  insert() { this.write = true; return this; }
  update() { this.write = true; return this; }
  upsert() { this.write = true; return this; }
  delete() { this.write = true; return this; }
  then<A, B>(ok?: ((v: { data: unknown; error: null }) => A | PromiseLike<A>) | null, fail?: ((e: unknown) => B | PromiseLike<B>) | null) {
    const rows = this.write ? [] : this.rows.filter((r) => this.filters.every((f) => f(r))).slice(0, this.max);
    const data = this.mode === "one" ? rows[0] ?? null : rows;
    return Promise.resolve({ data, error: null as null }).then(ok, fail);
  }
}

export function createDemoClient() {
  const tables = sampleData();
  const session = { access_token: "demo", user: { id: "demo" } };
  return {
    from: (table: string) => new Query(tables[table] ?? []),
    auth: {
      getSession: async () => ({ data: { session } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
      signOut: async () => ({ error: null }),
      signInWithPassword: async () => ({ error: null }),
      signUp: async () => ({ data: { session }, error: null }),
    },
  };
}
