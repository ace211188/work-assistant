"use client";

import { useState } from "react";
import { IconChevronUp, IconChevronDown, IconX, IconMessageCircle } from "@tabler/icons-react";
import { supabase } from "@/lib/supabase";
import { dateLabel, taipeiDate } from "@/lib/time";
import { discussEveningUrl } from "@/lib/claude";
import { sortByUrgency, type AssistantData } from "@/lib/useData";
import type { Brief, EveningContent, PlanItem, Todo } from "@/lib/types";
import TodoRow from "./TodoRow";

// 晚上回顧：助理擬好草稿，你調整後按確認（約 5 分鐘）
export default function EveningReview({
  brief,
  data,
  onConfirmed,
}: {
  brief: Brief<EveningContent> | null;
  data: AssistantData;
  onConfirmed: () => void;
}) {
  const today = taipeiDate();
  const c = brief?.content ?? {};
  const tomorrow = c.tomorrow?.date ?? taipeiDate(1);
  const byId = new Map(data.todos.map((t) => [t.id, t]));
  const isToday = (iso: string | null) =>
    !!iso && new Date(iso).toLocaleDateString("sv-SE", { timeZone: "Asia/Taipei" }) === today;

  const [plan, setPlan] = useState<PlanItem[]>(c.tomorrow?.plan ?? []);
  const [note, setNote] = useState(c.user_note ?? "");
  const [privateForm, setPrivateForm] = useState({ start: "", end: "", note: "" });
  const [privateSaved, setPrivateSaved] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const confirmed = brief?.status === "confirmed";

  // 今天完成的：以實際勾選為準，助理的清單只是參考
  const doneToday = data.todos.filter((t) => t.status === "done" && isToday(t.completed_at));
  const undone = (c.undone_ids ?? []).map((id) => byId.get(id)).filter((t): t is Todo => !!t && t.status === "open");
  const stale = (c.stale ?? []).filter((s) => byId.get(s.todo_id)?.status === "open");
  const planIds = new Set(plan.map((p) => p.todo_id));
  const addable = sortByUrgency(data.todos.filter((t) => t.status === "open" && !planIds.has(t.id)));

  const moveToTomorrow = (t: Todo) => data.updateTodo(t.id, { planned_date: tomorrow, defer_count: t.defer_count + 1 });

  function updatePlan(i: number, values: Partial<PlanItem>) {
    setPlan((prev) => prev.map((p, idx) => (idx === i ? { ...p, ...values } : p)));
  }
  function move(i: number, dir: -1 | 1) {
    setPlan((prev) => {
      const next = [...prev];
      const j = i + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  async function savePrivate(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from("pa_exceptions").insert({
      date: tomorrow,
      start_time: privateForm.start || null,
      end_time: privateForm.end || null,
      kind: "rest",
      note: privateForm.note || "私人行程",
    });
    if (!error) {
      const label = privateForm.start ? `${privateForm.start} – ${privateForm.end || "?"}` : "整天";
      setPrivateSaved((prev) => [...prev, `${label}　${privateForm.note || "私人行程"}`]);
      setPrivateForm({ start: "", end: "", note: "" });
    }
  }

  async function confirm() {
    if (!brief) return;
    setBusy(true);
    await Promise.all(
      plan.map((p) =>
        supabase
          .from("pa_todos")
          .update({ planned_date: tomorrow, planned_start: p.start || null, planned_end: p.end || null })
          .eq("id", p.todo_id)
      )
    );
    await supabase
      .from("pa_briefs")
      .update({
        status: "confirmed",
        confirmed_at: new Date().toISOString(),
        content: { ...c, tomorrow: { ...(c.tomorrow ?? { date: tomorrow }), plan }, user_note: note.trim() || undefined },
      })
      .eq("id", brief.id);
    await data.reload();
    onConfirmed();
    setBusy(false);
  }

  const iconBtn = "flex h-11 w-11 items-center justify-center";

  return (
    <>
      {brief ? (
        c.summary && <p className="mt-5 text-[15px] leading-[1.9]">{c.summary}</p>
      ) : (
        <p className="card mt-5 text-[15px] leading-[1.9]">每天晚上 10 點，助理會擬好今天的回顧和明天的排程草稿，你調整一下按確認就好。</p>
      )}

      <h2 className="sec">
        <span>Done today</span>
        <span className="num not-italic">{doneToday.length}</span>
      </h2>
      <div className="card divide-y divide-line py-1">
        {doneToday.map((t) => (
          <TodoRow key={t.id} todo={t} onToggle={() => data.updateTodo(t.id, { status: "open" })} />
        ))}
        {doneToday.length === 0 && <p className="py-3">今天還沒勾掉任何事，也沒關係。</p>}
      </div>

      {undone.length > 0 && (
        <>
          <h2 className="sec">Still open</h2>
          <div className="card divide-y divide-line py-1">
            {undone.map((t) => (
              <div key={t.id} className="py-3">
                <div className="leading-snug">{t.title}</div>
                {t.planned_date === tomorrow ? (
                  <p className="meta mt-1">已改到明天</p>
                ) : (
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button onClick={() => data.updateTodo(t.id, { status: "done" })} className="btn-quiet">完成了</button>
                    <button onClick={() => moveToTomorrow(t)} className="btn-quiet">改明天</button>
                    <button onClick={() => data.updateTodo(t.id, { status: "dropped" })} className="btn-quiet">不做了</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {stale.map((s) => (
        <p key={s.todo_id} className="card mt-2 leading-[1.8]">{s.message}</p>
      ))}

      <h2 className="sec">
        <span>Tomorrow</span>
        <span className="meta">{dateLabel(tomorrow)}</span>
      </h2>
      <div className="card divide-y divide-line py-1">
        {plan.map((p, i) => {
          const t = byId.get(p.todo_id);
          if (!t) return null;
          return (
            <div key={p.todo_id} className="py-2">
              <div className="flex items-center">
                <span className="min-w-0 flex-1 leading-snug">{t.title}</span>
                <button onClick={() => move(i, -1)} className={iconBtn} aria-label={`把「${t.title}」往前移`}><IconChevronUp size={18} stroke={1.6} /></button>
                <button onClick={() => move(i, 1)} className={iconBtn} aria-label={`把「${t.title}」往後移`}><IconChevronDown size={18} stroke={1.6} /></button>
                <button onClick={() => setPlan((prev) => prev.filter((_, idx) => idx !== i))} className={iconBtn} aria-label={`從明天移除「${t.title}」`}><IconX size={18} stroke={1.6} /></button>
              </div>
              <div className="num flex items-center gap-2">
                <input type="time" value={p.start ?? ""} onChange={(e) => updatePlan(i, { start: e.target.value })} aria-label="開始時間" className="field w-auto py-1" />
                <span>–</span>
                <input type="time" value={p.end ?? ""} onChange={(e) => updatePlan(i, { end: e.target.value })} aria-label="結束時間" className="field w-auto py-1" />
              </div>
              {p.reason && <p className="meta mt-1 leading-relaxed">{p.reason}</p>}
            </div>
          );
        })}
        {plan.length === 0 && <p className="py-3">還沒有排程，可以從下面加入。</p>}
      </div>
      {addable.length > 0 && (
        <select
          value=""
          onChange={(e) => e.target.value && setPlan((prev) => [...prev, { todo_id: Number(e.target.value) }])}
          aria-label="加入一件待辦到明天"
          className="field mt-2"
        >
          <option value="">加入一件待辦到明天…</option>
          {addable.map((t) => (
            <option key={t.id} value={t.id}>{t.title}</option>
          ))}
        </select>
      )}

      <h2 className="sec">{c.ask_private ?? "明天有私人行程嗎？"}</h2>
      <form onSubmit={savePrivate} className="card space-y-2">
        <p className="meta">Apple 行事曆還沒接上，私人行程先記在這裡，排程時會避開。</p>
        <div className="num flex items-center gap-2">
          <input type="time" value={privateForm.start} onChange={(e) => setPrivateForm({ ...privateForm, start: e.target.value })} aria-label="開始時間" className="field w-auto py-1" />
          <span>–</span>
          <input type="time" value={privateForm.end} onChange={(e) => setPrivateForm({ ...privateForm, end: e.target.value })} aria-label="結束時間" className="field w-auto py-1" />
        </div>
        <div className="flex gap-2">
          <input placeholder="例如：看牙醫" value={privateForm.note} onChange={(e) => setPrivateForm({ ...privateForm, note: e.target.value })} aria-label="私人行程內容" className="field min-w-0 flex-1" />
          <button className="btn shrink-0">記下</button>
        </div>
        {privateSaved.map((s) => (
          <p key={s} className="meta">已記下：{s}</p>
        ))}
      </form>

      <h2 className="sec">{c.reflection_question ?? "今天有什麼想記下的？"}</h2>
      <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="選填，一兩句就好" className="field" />

      <div className="mt-6 flex gap-2">
        <button onClick={confirm} disabled={!brief || busy} className="btn flex-1">
          {busy ? "儲存中…" : confirmed ? "已確認，可以再更新" : "確認明天的安排"}
        </button>
        <a href={discussEveningUrl(c.summary ?? "", undone.map((t) => t.title))} className="btn-quiet">
          <IconMessageCircle size={17} stroke={1.6} /> 聊聊
        </a>
      </div>
    </>
  );
}
