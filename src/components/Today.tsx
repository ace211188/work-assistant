"use client";

import { useCallback, useEffect, useState } from "react";
import { IconChevronDown } from "@tabler/icons-react";
import { supabase } from "@/lib/supabase";
import { dayRange, hhmm, taipeiDate, taipeiHour } from "@/lib/time";
import { sortByUrgency, type AssistantData } from "@/lib/useData";
import type { Brief, CalendarEvent, EveningContent, Feedback, MiddayContent, MorningContent, Thought, Todo } from "@/lib/types";
import FeedbackList from "./FeedbackList";
import Masthead, { englishDate } from "./Masthead";
import ThoughtCard from "./ThoughtCard";
import TodoRow from "./TodoRow";
import EveningReview from "./EveningReview";

export default function Today({ data, initialMode }: { data: AssistantData; initialMode?: "morning" | "evening" }) {
  const today = taipeiDate();
  const [morning, setMorning] = useState<Brief<MorningContent> | null>(null);
  const [midday, setMidday] = useState<Brief<MiddayContent> | null>(null);
  const [evening, setEvening] = useState<Brief<EveningContent> | null>(null);
  const [thought, setThought] = useState<Thought | null>(null);
  const [direction, setDirection] = useState<string | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [mode, setMode] = useState<"morning" | "evening">(initialMode ?? (taipeiHour() >= 21 ? "evening" : "morning"));

  const load = useCallback(async () => {
    const { from, to } = dayRange(today);
    const [b, d, e, f] = await Promise.all([
      supabase.from("pa_briefs").select("*").eq("date", today),
      supabase.from("pa_direction").select("content").order("created_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("pa_calendar_events").select("*").is("cancelled_at", null).gte("start_at", from).lte("start_at", to).order("start_at"),
      // 還沒按「收到」的回饋，最近 7 天
      supabase
        .from("pa_feedback")
        .select("*")
        .is("dismissed_at", null)
        .gte("created_at", new Date(Date.now() - 7 * 86400_000).toISOString())
        .order("created_at", { ascending: false })
        .limit(10),
    ]);
    setFeedback((f.data as Feedback[]) ?? []);
    const briefs = (b.data ?? []) as Brief<MorningContent & MiddayContent & EveningContent>[];
    const m = briefs.find((x) => x.kind === "morning") ?? null;
    const ev = briefs.find((x) => x.kind === "evening") ?? null;
    setMorning(m);
    setMidday(briefs.find((x) => x.kind === "midday") ?? null);
    setEvening(ev);
    setDirection(d.data?.content ?? null);
    setEvents((e.data as CalendarEvent[]) ?? []);
    if (m?.content.thought_id) {
      const { data: th } = await supabase.from("pa_thoughts").select("*").eq("id", m.content.thought_id).maybeSingle();
      setThought((th as Thought) ?? null);
    }
    if (!initialMode && ev?.status === "draft" && taipeiHour() >= 21) setMode("evening");
    setLoaded(true);
  }, [today, initialMode]);

  useEffect(() => {
    // 載入今天的早晚內容（非同步，結果回來才更新狀態）
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const { weekday, monthDay } = englishDate(today);

  return (
    <div>
      <Masthead
        title={weekday}
        subtitle={monthDay}
        aside={
          <div role="tablist" aria-label="早上或晚上" className="relative grid shrink-0 grid-cols-2 pb-1">
            {(["morning", "evening"] as const).map((m) => (
              <button key={m} role="tab" aria-selected={mode === m} onClick={() => setMode(m)} className="meta min-h-11 px-2">
                {m === "morning" ? "Morning" : "Evening"}
              </button>
            ))}
            <span
              aria-hidden
              className="slide-indicator pointer-events-none absolute bottom-[14px] left-0 flex w-1/2 justify-center"
              style={{ transform: `translateX(${mode === "morning" ? 0 : 100}%)` }}
            >
              <span className="h-px w-12 bg-fg" />
            </span>
          </div>
        }
      />

      {!loaded ? (
        <p className="meta py-16">Loading…</p>
      ) : (
        <div key={mode} className="view-enter">
          {mode === "morning" ? (
            <Morning brief={morning} midday={midday} thought={thought} direction={direction} events={events} feedback={feedback} data={data} />
          ) : (
            <EveningReview brief={evening} data={data} onConfirmed={load} />
          )}
        </div>
      )}
    </div>
  );
}

function Morning({
  brief,
  midday,
  thought,
  direction,
  events,
  feedback,
  data,
}: {
  brief: Brief<MorningContent> | null;
  midday: Brief<MiddayContent> | null;
  thought: Thought | null;
  direction: string | null;
  events: CalendarEvent[];
  feedback: Feedback[];
  data: AssistantData;
}) {
  const today = taipeiDate();
  const [showOthers, setShowOthers] = useState(false);
  const c = brief?.content ?? {};
  const byId = new Map(data.todos.map((t) => [t.id, t]));
  const toggle = (t: Todo) => data.updateTodo(t.id, { status: t.status === "done" ? "open" : "done" });

  // 中午重排過，下午的安排優先；早上的三件事只留下沒被排進下午的（多半是已經完成的）
  const noon = midday?.content;
  const afternoon = (noon?.afternoon?.plan ?? []).map((x) => ({ ...x, todo: byId.get(x.todo_id) })).filter((x) => x.todo);
  const afternoonIds = new Set(afternoon.map((x) => x.todo_id));
  const top = (c.top3 ?? [])
    .map((x) => ({ ...x, todo: byId.get(x.todo_id) }))
    .filter((x) => x.todo && !afternoonIds.has(x.todo_id));
  const planned = new Set([...afternoonIds, ...top.map((x) => x.todo_id)]);
  const others = sortByUrgency(data.todos.filter((t) => t.status === "open" && !planned.has(t.id)));
  const ideas = [...(c.ideas ?? []), ...(noon?.ideas ?? [])];
  const stale = (c.stale ?? []).map((x) => ({ ...x, todo: byId.get(x.todo_id) })).filter((x) => x.todo?.status === "open");

  return (
    <>
      {c.greeting && <p className="mt-5 text-[15px] leading-[1.9]">{c.greeting}</p>}

      <h2 className="sec">Thought of the day</h2>
      {thought ? (
        <ThoughtCard thought={thought} direction={direction} />
      ) : (
        <p className="card text-[15px] leading-[1.9]">
          {brief ? "今天沒有思考內容。" : "每天早上 7 點，這裡會先出現一則讓你從全局思考的內容，再來才是待辦。"}
        </p>
      )}

      {/* 回饋也是思考的一部分，放在待辦之前 */}
      <FeedbackList key={feedback.map((f) => f.id).join()} list={feedback} onTodoAdded={data.reload} />

      <Schedule events={events} slots={noon?.afternoon?.free_slots ?? c.free_slots} />

      {midday && (
        <>
          <h2 className="sec">
            <span>This afternoon</span>
            <span className="meta">中午重排</span>
          </h2>
          {noon?.summary && <p className="mb-3 text-[15px] leading-[1.9]">{noon.summary}</p>}
          {afternoon.length > 0 ? (
            <div className="space-y-2">
              {afternoon.map((x) => (
                <PlanCard key={x.todo_id} todo={x.todo!} onToggle={() => toggle(x.todo!)} slot={x.start ? `${x.start} – ${x.end ?? ""}` : undefined} reason={x.reason} />
              ))}
            </div>
          ) : (
            <p className="card text-[15px] leading-[1.9]">下午沒有可以排工作的空檔，休息一下也好。</p>
          )}
        </>
      )}

      {(!midday || top.length > 0) && <h2 className="sec">First three</h2>}
      {top.length > 0 ? (
        <div className="space-y-2">
          {top.map((x) => (
            <PlanCard key={x.todo_id} todo={x.todo!} onToggle={() => toggle(x.todo!)} slot={x.slot} reason={x.reason} />
          ))}
        </div>
      ) : (
        !midday && <p className="card text-[15px] leading-[1.9]">早上整理過後，助理會挑出今天最該先做的三件事。</p>
      )}

      {stale.length > 0 && (
        <>
          <h2 className="sec">Worth another look</h2>
          <div className="space-y-2">
            {stale.map((x) => (
              <div key={x.todo_id} className="card">
                <p className="leading-[1.8]">{x.message}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button onClick={() => data.updateTodo(x.todo_id, { planned_date: today })} className="btn-quiet">今天做</button>
                  <button onClick={() => data.updateTodo(x.todo_id, { status: "done" })} className="btn-quiet">已經做完</button>
                  <button onClick={() => data.updateTodo(x.todo_id, { status: "dropped" })} className="btn-quiet">不做了</button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {ideas.length > 0 && (
        <>
          <h2 className="sec">Notes to self</h2>
          <ul className="card space-y-2 leading-[1.8]">
            {ideas.map((i) => (
              <li key={i.inbox_id}>{i.text}</li>
            ))}
          </ul>
        </>
      )}

      <button onClick={() => setShowOthers((v) => !v)} aria-expanded={showOthers} className="sec w-full text-left">
        <span>Everything else</span>
        <span className="num inline-flex items-center gap-1 not-italic">
          {others.length}
          <IconChevronDown size={16} stroke={1.6} className={`transition-transform ${showOthers ? "rotate-180" : ""}`} />
        </span>
      </button>
      {showOthers && (
        <div className="card divide-y divide-line py-1">
          {others.map((t) => (
            <TodoRow key={t.id} todo={t} onToggle={() => toggle(t)} />
          ))}
          {others.length === 0 && <p className="py-3">沒有其他待辦了。</p>}
        </div>
      )}
    </>
  );
}

// 今天行程：自己的行程直接列出；教室其他課收合；可以修正「這是不是我的行程」
// 排好時段的一件事，一張卡；左邊的圓圈點一下就完成
function PlanCard({ todo, onToggle, slot, reason }: { todo: Todo; onToggle: () => void; slot?: string; reason?: string }) {
  return (
    <div className="card py-1.5">
      <TodoRow
        todo={todo}
        onToggle={onToggle}
        time={slot ? "" : undefined}
        extra={
          (slot || reason) && (
            <p className="meta mt-1 leading-relaxed">
              {slot && <span className="num not-italic">{slot}　</span>}
              {reason}
            </p>
          )
        }
      />
    </div>
  );
}

// 同一堂課常同時記在 Apple「教課」（只寫學生名，如「子毅」）和 Google 教室行事曆（如「子毅/爵士鼓/宇群」）。
// 同一時段、Google 標題包含 Apple 標題就當成同一筆：留 Google 那筆（標題較完整），並算成你的行程。
function mergeTwins(events: CalendarEvent[]) {
  const sameTime = (a: CalendarEvent, b: CalendarEvent) =>
    +new Date(a.start_at) === +new Date(b.start_at) && +new Date(a.end_at) === +new Date(b.end_at);
  const twinned = new Set<number>();
  const hidden = new Set<number>();
  for (const a of events) {
    const name = a.title?.trim();
    if (a.source !== "apple" || !name) continue;
    // 同時段的團班標題也可能含這個學生名（「C2/子毅,品言/樂理」），先配標成你的那筆
    const candidates = events.filter((x) => x.source === "google" && !twinned.has(x.id) && sameTime(a, x) && (x.title ?? "").includes(name));
    const g = candidates.find((x) => x.involves_me) ?? candidates[0];
    if (g) {
      twinned.add(g.id);
      hidden.add(a.id);
    }
  }
  return { visible: events.filter((e) => !hidden.has(e.id)), twinned };
}

function Schedule({ events, slots }: { events: CalendarEvent[]; slots?: MorningContent["free_slots"] }) {
  const [list, setList] = useState(events);
  const [showClassroom, setShowClassroom] = useState(false);
  const { visible, twinned } = mergeTwins(list);
  const mine = (e: CalendarEvent) => e.involves_me_override ?? (e.involves_me || twinned.has(e.id));
  const myEvents = visible.filter(mine);
  const classroom = visible.filter((e) => !mine(e));

  async function setMine(e: CalendarEvent, value: boolean) {
    setList((prev) => prev.map((x) => (x.id === e.id ? { ...x, involves_me_override: value } : x)));
    await supabase.from("pa_calendar_events").update({ involves_me_override: value }).eq("id", e.id);
  }

  const row = (e: CalendarEvent, isMine: boolean) => (
    <div key={e.id} className="flex items-center gap-3">
      <span className={`h-[7px] w-[7px] shrink-0 rounded-full ${isMine ? "bg-dot" : "border border-fg"}`} />
      <div className="min-w-0 flex-1 py-[10px]">
        <div className="leading-snug">{e.title}</div>
        <div className="meta leading-snug">
          <span className="num not-italic">{e.all_day ? "All day" : `${hhmm(e.start_at)} – ${hhmm(e.end_at)}`}</span>
          {e.calendar_name && `　${e.calendar_name}`}
        </div>
      </div>
      <button onClick={() => setMine(e, !isMine)} className="meta min-h-11 shrink-0 underline underline-offset-4">
        {isMine ? "不是我的" : "是我的"}
      </button>
    </div>
  );

  return (
    <>
      <h2 className="sec">Schedule</h2>
      <div className="card py-1">
        {myEvents.length > 0 ? (
          <div className="divide-y divide-line">{myEvents.map((e) => row(e, true))}</div>
        ) : (
          <p className="py-3">行事曆上今天沒有你的行程。</p>
        )}
        {slots && slots.some((s) => s.kind === "work") && (
          <p className="num border-t border-line py-3 text-[15px]">
            <span className="meta mr-2">Open time</span>
            {slots.filter((s) => s.kind === "work").map((s) => `${s.start} – ${s.end}`).join("、")}
          </p>
        )}
        {classroom.length > 0 && (
          <div className="border-t border-line">
            <button onClick={() => setShowClassroom((v) => !v)} aria-expanded={showClassroom} className="flex min-h-11 w-full items-center justify-between">
              <span>教室其他行程 <span className="num">{classroom.length}</span> 筆</span>
              <IconChevronDown size={16} stroke={1.6} className={`transition-transform ${showClassroom ? "rotate-180" : ""}`} />
            </button>
            {showClassroom && <div className="divide-y divide-line">{classroom.map((e) => row(e, false))}</div>}
          </div>
        )}
      </div>
    </>
  );
}
