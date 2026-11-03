// 個人工作助理｜iPhone 小工具（Scriptable）的資料
//
// 只讀。請求要帶 x-widget-key（在 App 設定頁產生的金鑰）；資料庫只存金鑰的 SHA-256 雜湊。
// 回傳今天最少量的資訊：下一件事、還剩幾件、下一個自己的行程、今天完成幾件。

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const TZ = "Asia/Taipei";
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
// 與 App 的 layout.tsx 一致：每天一種封面色
const DAY_COLORS = ["#596279", "#526478", "#566655", "#685e77", "#765b60", "#4c666b", "#616265"];

type PlanItem = { todo_id: number; start?: string; end?: string; slot?: string };

async function sha256(text: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

const hhmm = (iso: string) => new Date(iso).toLocaleTimeString("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });

Deno.serve(async (req) => {
  const key = req.headers.get("x-widget-key")?.trim();
  if (!key) return json({ error: "缺少小工具金鑰" }, 401);

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: row } = await supabase.from("pa_widget_keys").select("id, user_id").eq("key_hash", await sha256(key)).maybeSingle();
  if (!row) return json({ error: "金鑰無效，請到 App 設定頁重新產生" }, 401);
  await supabase.from("pa_widget_keys").update({ last_used_at: new Date().toISOString() }).eq("id", row.id);
  const uid = row.user_id;

  const now = new Date();
  const today = now.toLocaleDateString("sv-SE", { timeZone: TZ });
  const nowTime = hhmm(now.toISOString());
  const day = new Date(`${today}T12:00:00+08:00`).getUTCDay();
  const dayEnd = new Date(`${today}T23:59:59+08:00`).toISOString();

  const [briefs, events, done] = await Promise.all([
    supabase.from("pa_briefs").select("kind, content").eq("user_id", uid).eq("date", today).in("kind", ["morning", "midday"]),
    supabase
      .from("pa_calendar_events")
      .select("title, start_at, involves_me, involves_me_override")
      .eq("user_id", uid)
      .is("cancelled_at", null)
      .eq("all_day", false)
      .gt("start_at", now.toISOString())
      .lte("start_at", dayEnd)
      .order("start_at")
      .limit(20),
    supabase
      .from("pa_todos")
      .select("id", { count: "exact", head: true })
      .eq("user_id", uid)
      .eq("status", "done")
      .gte("completed_at", new Date(`${today}T00:00:00+08:00`).toISOString()),
  ]);

  // 中午重排過就用下午的安排，否則用早上的三件事
  const midday = briefs.data?.find((b) => b.kind === "midday")?.content;
  const morning = briefs.data?.find((b) => b.kind === "morning")?.content;
  const plan: PlanItem[] = midday?.afternoon?.plan ?? morning?.top3 ?? [];
  const startOf = (p: PlanItem) => p.start ?? p.slot?.match(/\d{1,2}:\d{2}/)?.[0] ?? "";

  const { data: todos } = plan.length
    ? await supabase.from("pa_todos").select("id, title, status").eq("user_id", uid).in("id", plan.map((p) => p.todo_id))
    : { data: [] };
  const byId = new Map((todos ?? []).map((t) => [t.id, t]));
  const open = plan.filter((p) => byId.get(p.todo_id)?.status === "open");
  // 下一件：還沒結束的第一件；都過時了就拿第一件沒做的
  const next = open.find((p) => (p.end ?? p.slot?.match(/\d{1,2}:\d{2}$/)?.[0] ?? "99:99") >= nowTime) ?? open[0];

  const mine = (events.data ?? []).find((e) => (e.involves_me_override ?? e.involves_me) === true);

  return json({
    date: today,
    weekday: WEEKDAYS[day],
    color: DAY_COLORS[day],
    next: next ? { title: byId.get(next.todo_id)!.title, time: startOf(next) } : null,
    remaining: open.length,
    event: mine ? { title: mine.title, time: hhmm(mine.start_at) } : null,
    done: done.count ?? 0,
  });
});
