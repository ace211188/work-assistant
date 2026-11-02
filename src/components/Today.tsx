"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { dateLabel, dayRange, hhmm, taipeiDate, taipeiHour } from "@/lib/time";
import { sortByUrgency, type AssistantData } from "@/lib/useData";
import type { Brief, CalendarEvent, EveningContent, MorningContent, Thought, Todo } from "@/lib/types";
import ThoughtCard from "./ThoughtCard";
import TodoRow from "./TodoRow";
import EveningReview from "./EveningReview";

export default function Today({ data }: { data: AssistantData }) {
  const today = taipeiDate();
  const [morning, setMorning] = useState<Brief<MorningContent> | null>(null);
  const [evening, setEvening] = useState<Brief<EveningContent> | null>(null);
  const [thought, setThought] = useState<Thought | null>(null);
  const [direction, setDirection] = useState<string | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [mode, setMode] = useState<"morning" | "evening">(taipeiHour() >= 21 ? "evening" : "morning");

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
    if (ev?.status === "draft") setMode("evening");
    setLoaded(true);
  }, [today]);

  useEffect(() => {
    // 載入今天的早晚內容（非同步，結果回來才更新狀態）
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  if (!loaded) return <p className="py-20 text-center text-muted">載入中…</p>;

  return (
    <div className="space-y-5">
      <header className="flex items-end justify-between">
        <div>
          <div className="text-sm text-muted">{dateLabel(today)}・{today}</div>
          <h1 className="text-2xl font-bold">{mode === "morning" ? "早安，宇群" : "今天辛苦了"}</h1>
        </div>
        <div className="flex rounded-full border border-line bg-card p-0.5 text-sm">
          {(["morning", "evening"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`rounded-full px-3 py-1 ${mode === m ? "bg-accent text-white" : "text-muted"}`}
            >
              {m === "morning" ? "早上" : "晚上"}
            </button>
          ))}
        </div>
      </header>

      {mode === "morning" ? (
        <Morning brief={morning} thought={thought} direction={direction} events={events} data={data} />
      ) : (
        <EveningReview brief={evening} data={data} onConfirmed={load} />
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
      {c.greeting && <p className="leading-relaxed">{c.greeting}</p>}

      {thought ? (
        <ThoughtCard thought={thought} direction={direction} />
      ) : (
        <section className="rounded-2xl border border-dashed border-line p-5 text-sm text-muted">
          {brief ? "今天沒有思考內容。" : "每天早上 7 點，這裡會先出現一則讓你從全局思考的內容，再來才是待辦。"}
        </section>
      )}

      <Schedule events={events} slots={c.free_slots} />

      <section>
        <h2 className="mb-1 font-bold">今天建議先做</h2>
        {top.length > 0 ? (
          <div className="divide-y divide-line rounded-2xl border border-line bg-card px-4">
            {top.map((x) => (
              <TodoRow
                key={x.todo_id}
                todo={x.todo!}
                onToggle={() => toggle(x.todo!)}
                extra={
                  (x.slot || x.reason) && (
                    <div className="mt-1 text-xs text-muted">
                      {x.slot && <span className="mr-2 text-accent">🕐 {x.slot}</span>}
                      {x.reason}
                    </div>
                  )
                }
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted">早上排程跑過後，助理會挑出最該先做的 3 件事。</p>
        )}
      </section>

      {stale.length > 0 && (
        <section className="space-y-2">
          {stale.map((x) => (
            <div key={x.todo_id} className="rounded-2xl bg-accent-soft p-4 text-sm">
              <p>{x.message}</p>
              <div className="mt-2 flex gap-2">
                <button
                  onClick={() => data.updateTodo(x.todo_id, { planned_date: today })}
                  className="rounded-lg bg-card px-3 py-1.5"
                >
                  今天做
                </button>
                <button
                  onClick={() => data.updateTodo(x.todo_id, { status: "done" })}
                  className="rounded-lg bg-card px-3 py-1.5"
                >
                  已經做完
                </button>
                <button
                  onClick={() => data.updateTodo(x.todo_id, { status: "dropped" })}
                  className="rounded-lg bg-card px-3 py-1.5"
                >
                  不做了
                </button>
              </div>
            </div>
          ))}
        </section>
      )}

      {(c.ideas?.length ?? 0) > 0 && (
        <section>
          <h2 className="mb-1 font-bold">你記下的想法</h2>
          <ul className="space-y-1 text-sm">
            {c.ideas!.map((i) => (
              <li key={i.inbox_id} className="rounded-xl bg-card px-4 py-2">💡 {i.text}</li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <button onClick={() => setShowOthers((v) => !v)} className="font-bold">
          其他待辦（{others.length}）{showOthers ? "▴" : "▾"}
        </button>
        {showOthers && (
          <div className="mt-1 divide-y divide-line rounded-2xl border border-line bg-card px-4">
            {others.map((t) => (
              <TodoRow key={t.id} todo={t} onToggle={() => toggle(t)} />
            ))}
            {others.length === 0 && <p className="py-3 text-sm text-muted">沒有其他待辦 🎉</p>}
          </div>
        )}
      </section>
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
    <div key={e.id} className="flex items-center gap-3 py-2 text-sm">
      <span className="w-24 shrink-0 text-muted tabular-nums">
        {e.all_day ? "整天" : `${hhmm(e.start_at)}–${hhmm(e.end_at)}`}
      </span>
      <span className="min-w-0 flex-1 truncate">
        {e.title}
        {e.calendar_name && <span className="ml-1 text-xs text-muted">・{e.calendar_name}</span>}
      </span>
      <button onClick={() => setMine(e, !isMine)} className="shrink-0 text-xs text-muted underline">
        {isMine ? "不是我的" : "是我的"}
      </button>
    </div>
  );

  return (
    <section>
      <h2 className="mb-1 font-bold">今天行程</h2>
      <div className="rounded-2xl border border-line bg-card px-4 py-1">
        {myEvents.length > 0 ? (
          <div className="divide-y divide-line">{myEvents.map((e) => row(e, true))}</div>
        ) : (
          <p className="py-2 text-sm text-muted">行事曆上今天沒有你的行程。</p>
        )}
        {slots && slots.length > 0 && (
          <div className="flex flex-wrap gap-1.5 border-t border-line py-2">
            {slots.map((s, i) => (
              <span
                key={i}
                className={`rounded-full px-2.5 py-1 text-xs ${s.kind === "work" ? "bg-ok/15 text-ok" : "bg-line text-muted"}`}
              >
                {s.start}–{s.end} {s.kind === "work" ? "可工作" : "休息"}
              </span>
            ))}
          </div>
        )}
        {classroom.length > 0 && (
          <div className="border-t border-line py-2">
            <button onClick={() => setShowClassroom((v) => !v)} className="text-sm text-muted">
              教室其他行程 {classroom.length} 筆 {showClassroom ? "▴" : "▾"}
            </button>
            {showClassroom && <div className="divide-y divide-line">{classroom.map((e) => row(e, false))}</div>}
          </div>
        )}
      </div>
    </section>
  );
}
