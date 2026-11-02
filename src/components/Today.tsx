"use client";

import { useCallback, useEffect, useState } from "react";
import { IconChevronDown } from "@tabler/icons-react";
import { supabase } from "@/lib/supabase";
import { dayRange, hhmm, taipeiDate, taipeiHour } from "@/lib/time";
import { sortByUrgency, type AssistantData } from "@/lib/useData";
import type { Brief, CalendarEvent, EveningContent, MorningContent, Thought, Todo } from "@/lib/types";
import Masthead, { englishDate } from "./Masthead";
import ThoughtCard from "./ThoughtCard";
import TodoRow from "./TodoRow";
import EveningReview from "./EveningReview";

export default function Today({ data, initialMode }: { data: AssistantData; initialMode?: "morning" | "evening" }) {
  const today = taipeiDate();
  const [morning, setMorning] = useState<Brief<MorningContent> | null>(null);
  const [evening, setEvening] = useState<Brief<EveningContent> | null>(null);
  const [thought, setThought] = useState<Thought | null>(null);
  const [direction, setDirection] = useState<string | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [mode, setMode] = useState<"morning" | "evening">(initialMode ?? (taipeiHour() >= 21 ? "evening" : "morning"));

  const load = useCallback(async () => {
    const { from, to } = dayRange(today);
    const [b, d, e] = await Promise.all([
      supabase.from("pa_briefs").select("*").eq("date", today),
      supabase.from("pa_direction").select("content").order("created_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("pa_calendar_events").select("*").gte("start_at", from).lte("start_at", to).order("start_at"),
    ]);
    const briefs = (b.data ?? []) as Brief<MorningContent & EveningContent>[];
    const m = briefs.find((x) => x.kind === "morning") ?? null;
    const ev = briefs.find((x) => x.kind === "evening") ?? null;
    setMorning(m);
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
            <Morning brief={morning} thought={thought} direction={direction} events={events} data={data} />
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
  thought,
  direction,
  events,
  data,
}: {
  brief: Brief<MorningContent> | null;
  thought: Thought | null;
  direction: string | null;
  events: CalendarEvent[];
  data: AssistantData;
}) {
  const today = taipeiDate();
  const [showOthers, setShowOthers] = useState(false);
  const c = brief?.content ?? {};
  const byId = new Map(data.todos.map((t) => [t.id, t]));
  const toggle = (t: Todo) => data.updateTodo(t.id, { status: t.status === "done" ? "open" : "done" });

  const top = (c.top3 ?? []).map((x) => ({ ...x, todo: byId.get(x.todo_id) })).filter((x) => x.todo);
  const topIds = new Set(top.map((x) => x.todo_id));
  const others = sortByUrgency(data.todos.filter((t) => t.status === "open" && !topIds.has(t.id)));
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

      <Schedule events={events} slots={c.free_slots} />

      <h2 className="sec">First three</h2>
      {top.length > 0 ? (
        <div className="card divide-y divide-line py-1">
          {top.map((x) => (
            <TodoRow
              key={x.todo_id}
              todo={x.todo!}
              onToggle={() => toggle(x.todo!)}
              time={x.slot ? "" : undefined}
              extra={
                (x.slot || x.reason) && (
                  <p className="meta mt-1 leading-relaxed">
                    {x.slot && <span className="num not-italic">{x.slot}　</span>}
                    {x.reason}
                  </p>
                )
              }
            />
          ))}
        </div>
      ) : (
        <p className="card text-[15px] leading-[1.9]">早上整理過後，助理會挑出今天最該先做的三件事。</p>
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

      {(c.ideas?.length ?? 0) > 0 && (
        <>
          <h2 className="sec">Notes to self</h2>
          <ul className="card space-y-2 leading-[1.8]">
            {c.ideas!.map((i) => (
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
function Schedule({ events, slots }: { events: CalendarEvent[]; slots?: MorningContent["free_slots"] }) {
  const [list, setList] = useState(events);
  const [showClassroom, setShowClassroom] = useState(false);
  const mine = (e: CalendarEvent) => e.involves_me_override ?? e.involves_me;
  const myEvents = list.filter(mine);
  const classroom = list.filter((e) => !mine(e));

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
