"use client";

import { useState } from "react";
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
  const isToday = (iso: string | null) =>
    !!iso && new Date(iso).toLocaleDateString("sv-SE", { timeZone: "Asia/Taipei" }) === today;
  const tomorrow = c.tomorrow?.date ?? taipeiDate(1);
  const byId = new Map(data.todos.map((t) => [t.id, t]));

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

  const moveToTomorrow = (t: Todo) =>
    data.updateTodo(t.id, { planned_date: tomorrow, defer_count: t.defer_count + 1 });

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
      const label = privateForm.start ? `${privateForm.start}–${privateForm.end || "?"}` : "整天";
      setPrivateSaved((prev) => [...prev, `${label} ${privateForm.note || "私人行程"}`]);
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

  return (
    <>
      {!brief && (
        <section className="rounded-2xl border border-dashed border-line p-5 text-sm text-muted">
          每天晚上 10 點，助理會擬好今天的回顧和明天的排程草稿，你調整一下按確認就好。
        </section>
      )}

      {c.summary && <p className="leading-relaxed">{c.summary}</p>}

      <section>
        <h2 className="mb-1 font-bold">今天完成（{doneToday.length}）</h2>
        <div className="divide-y divide-line rounded-2xl border border-line bg-card px-4">
          {doneToday.map((t) => (
            <TodoRow key={t.id} todo={t} onToggle={() => data.updateTodo(t.id, { status: "open" })} />
          ))}
          {doneToday.length === 0 && <p className="py-3 text-sm text-muted">今天還沒勾掉任何事，也沒關係。</p>}
        </div>
      </section>

      {undone.length > 0 && (
        <section>
          <h2 className="mb-1 font-bold">沒完成的</h2>
          <div className="divide-y divide-line rounded-2xl border border-line bg-card px-4">
            {undone.map((t) => (
              <div key={t.id} className="py-2.5">
                <div>{t.title}</div>
                {t.planned_date === tomorrow ? (
                  <p className="mt-1 text-xs text-ok">已改到明天</p>
                ) : (
                  <div className="mt-2 flex gap-2 text-sm">
                    <button onClick={() => data.updateTodo(t.id, { status: "done" })} className="rounded-lg border border-line px-3 py-1">
                      完成了
                    </button>
                    <button onClick={() => moveToTomorrow(t)} className="rounded-lg border border-line px-3 py-1">
                      改明天
                    </button>
                    <button onClick={() => data.updateTodo(t.id, { status: "dropped" })} className="rounded-lg border border-line px-3 py-1">
                      不做了
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {stale.map((s) => (
        <p key={s.todo_id} className="rounded-2xl bg-accent-soft p-4 text-sm">{s.message}</p>
      ))}

      <section>
        <h2 className="mb-1 font-bold">{dateLabel(tomorrow)}的排程草稿</h2>
        <div className="divide-y divide-line rounded-2xl border border-line bg-card px-4">
          {plan.map((p, i) => {
            const t = byId.get(p.todo_id);
            if (!t) return null;
            return (
              <div key={p.todo_id} className="py-2.5">
                <div className="flex items-start gap-2">
                  <span className="min-w-0 flex-1">{t.title}</span>
                  <button onClick={() => move(i, -1)} className="px-1 text-muted" aria-label="往上">▲</button>
                  <button onClick={() => move(i, 1)} className="px-1 text-muted" aria-label="往下">▼</button>
                  <button onClick={() => setPlan((prev) => prev.filter((_, idx) => idx !== i))} className="px-1 text-muted" aria-label="移除">✕</button>
                </div>
                <div className="mt-1 flex items-center gap-1 text-sm">
                  <input type="time" value={p.start ?? ""} onChange={(e) => updatePlan(i, { start: e.target.value })} className="rounded border border-line bg-background px-1" />
                  <span>–</span>
                  <input type="time" value={p.end ?? ""} onChange={(e) => updatePlan(i, { end: e.target.value })} className="rounded border border-line bg-background px-1" />
                </div>
                {p.reason && <p className="mt-1 text-xs text-muted">{p.reason}</p>}
              </div>
            );
          })}
          {plan.length === 0 && <p className="py-3 text-sm text-muted">還沒有排程，可以從下面加入。</p>}
        </div>
        {addable.length > 0 && !confirmed && (
          <select
            value=""
            onChange={(e) => e.target.value && setPlan((prev) => [...prev, { todo_id: Number(e.target.value) }])}
            className="mt-2 w-full rounded-xl border border-line bg-card px-3 py-2 text-sm"
          >
            <option value="">＋ 加入一件待辦到明天</option>
            {addable.map((t) => (
              <option key={t.id} value={t.id}>{t.title}</option>
            ))}
          </select>
        )}
      </section>

      <section className="rounded-2xl border border-line bg-card p-4">
        <h2 className="font-bold">{c.ask_private ?? "明天有私人行程嗎？"}</h2>
        <p className="mt-1 text-xs text-muted">Apple 行事曆還沒接上，私人行程先記在這裡，助理排程時會避開。</p>
        <form onSubmit={savePrivate} className="mt-2 flex flex-wrap items-center gap-2 text-sm">
          <input type="time" value={privateForm.start} onChange={(e) => setPrivateForm({ ...privateForm, start: e.target.value })} className="rounded border border-line bg-background px-1" />
          <span>–</span>
          <input type="time" value={privateForm.end} onChange={(e) => setPrivateForm({ ...privateForm, end: e.target.value })} className="rounded border border-line bg-background px-1" />
          <input placeholder="例如：看牙醫" value={privateForm.note} onChange={(e) => setPrivateForm({ ...privateForm, note: e.target.value })} className="min-w-0 flex-1 rounded border border-line bg-background px-2 py-1" />
          <button className="rounded-lg bg-accent px-3 py-1 text-white">記下</button>
        </form>
        {privateSaved.map((s) => (
          <p key={s} className="mt-1 text-sm text-ok">✓ {s}</p>
        ))}
      </section>

      <section>
        <h2 className="mb-1 font-bold">{c.reflection_question ?? "今天有什麼想記下的？"}</h2>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder="選填，一兩句就好"
          className="w-full rounded-xl border border-line bg-card px-3 py-2 outline-none focus:border-accent"
        />
      </section>

      <div className="flex gap-2">
        <button
          onClick={confirm}
          disabled={!brief || busy}
          className="flex-1 rounded-xl bg-accent py-3 font-semibold text-white disabled:opacity-40"
        >
          {confirmed ? "已確認 ✓（可再更新）" : busy ? "儲存中…" : "確認明天的安排"}
        </button>
        <a
          href={discussEveningUrl(c.summary ?? "", undone.map((t) => t.title))}
          className="rounded-xl border border-accent px-4 py-3 text-sm text-accent"
        >
          💬 聊聊
        </a>
      </div>
    </>
  );
}
