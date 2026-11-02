"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { dateLabel } from "@/lib/time";
import { effectiveUrgency, sortByUrgency, URGENCY_LABEL, type AssistantData } from "@/lib/useData";
import type { Todo, TodoStatus, Urgency } from "@/lib/types";
import TodoRow from "./TodoRow";

const FILTERS: { key: TodoStatus; label: string }[] = [
  { key: "open", label: "未完成" },
  { key: "done", label: "已完成" },
  { key: "dropped", label: "不做了" },
];

export default function Todos({ data }: { data: AssistantData }) {
  const [filter, setFilter] = useState<TodoStatus>("open");
  const [category, setCategory] = useState<string>("");
  const [editing, setEditing] = useState<number | null>(null);

  const categories = [...new Set(data.todos.map((t) => t.category).filter((c): c is string => !!c))];
  const list = sortByUrgency(
    data.todos.filter((t) => t.status === filter && (!category || t.category === category))
  );
  const toggle = (t: Todo) => data.updateTodo(t.id, { status: t.status === "done" ? "open" : "done" });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">待辦</h1>

      {data.inbox.length > 0 && (
        <section className="rounded-2xl border border-dashed border-line p-4">
          <h2 className="text-sm font-semibold text-muted">待整理（{data.inbox.length}）</h2>
          <p className="text-xs text-muted">下一次排程（7:00／22:00）會整理成待辦，判斷日期、分類和緊急程度。</p>
          <ul className="mt-2 space-y-1 text-sm">
            {data.inbox.map((i) => (
              <li key={i.id} className="flex items-center gap-2">
                <span className="min-w-0 flex-1">・{i.text}</span>
                <button
                  onClick={async () => {
                    await supabase.from("pa_inbox").delete().eq("id", i.id);
                    data.reload();
                  }}
                  className="text-xs text-muted underline"
                >
                  刪除
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="flex gap-2 overflow-x-auto">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`shrink-0 rounded-full px-3 py-1 text-sm ${filter === f.key ? "bg-accent text-white" : "border border-line"}`}
          >
            {f.label}（{data.todos.filter((t) => t.status === f.key).length}）
          </button>
        ))}
      </div>
      {categories.length > 0 && (
        <div className="flex gap-2 overflow-x-auto text-xs">
          <button onClick={() => setCategory("")} className={`shrink-0 rounded-full px-2.5 py-1 ${!category ? "bg-foreground text-background" : "border border-line"}`}>
            全部
          </button>
          {categories.map((c) => (
            <button key={c} onClick={() => setCategory(c)} className={`shrink-0 rounded-full px-2.5 py-1 ${category === c ? "bg-foreground text-background" : "border border-line"}`}>
              {c}
            </button>
          ))}
        </div>
      )}

      <div className="divide-y divide-line rounded-2xl border border-line bg-card px-4">
        {list.map((t) => (
          <div key={t.id}>
            <TodoRow todo={t} onToggle={() => toggle(t)} onClick={() => setEditing(editing === t.id ? null : t.id)} />
            {editing === t.id && <TodoEditor todo={t} data={data} onClose={() => setEditing(null)} />}
          </div>
        ))}
        {list.length === 0 && <p className="py-4 text-sm text-muted">這裡是空的。</p>}
      </div>
      <p className="text-xs text-muted">點一下待辦可以修改緊急程度、日期和分類。助理會從你的修改學習你的習慣。</p>
    </div>
  );
}

function TodoEditor({ todo, data, onClose }: { todo: Todo; data: AssistantData; onClose: () => void }) {
  const [form, setForm] = useState({
    title: todo.title,
    notes: todo.notes ?? "",
    category: todo.category ?? "",
    due_date: todo.due_date ?? "",
    planned_date: todo.planned_date ?? "",
    urgency: (todo.urgency_override ?? "") as Urgency | "",
  });

  async function save() {
    await data.updateTodo(todo.id, {
      title: form.title.trim() || todo.title,
      notes: form.notes.trim() || null,
      category: form.category.trim() || null,
      due_date: form.due_date || null,
      planned_date: form.planned_date || null,
      urgency_override: form.urgency || null,
    });
    onClose();
  }

  const field = "w-full rounded-lg border border-line bg-background px-2 py-1.5";
  return (
    <div className="mb-3 space-y-2 rounded-xl bg-background p-3 text-sm">
      <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={field} />
      <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} placeholder="備註" className={field} />
      <div className="grid grid-cols-2 gap-2">
        <label className="space-y-1">
          <span className="text-xs text-muted">緊急程度</span>
          <select value={form.urgency} onChange={(e) => setForm({ ...form, urgency: e.target.value as Urgency | "" })} className={field}>
            <option value="">
              照 AI 判斷{todo.urgency_ai ? `（${URGENCY_LABEL[todo.urgency_ai]}）` : ""}
            </option>
            <option value="high">急</option>
            <option value="medium">中</option>
            <option value="low">緩</option>
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-xs text-muted">分類</span>
          <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={field} />
        </label>
        <label className="space-y-1">
          <span className="text-xs text-muted">截止日</span>
          <input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} className={field} />
        </label>
        <label className="space-y-1">
          <span className="text-xs text-muted">預計哪天做</span>
          <input type="date" value={form.planned_date} onChange={(e) => setForm({ ...form, planned_date: e.target.value })} className={field} />
        </label>
      </div>
      {todo.urgency_reason && (
        <p className="text-xs text-muted">
          AI 判斷{effectiveUrgency(todo) ? `「${URGENCY_LABEL[todo.urgency_ai ?? "medium"]}」` : ""}的理由：{todo.urgency_reason}
        </p>
      )}
      {todo.defer_count > 0 && <p className="text-xs text-muted">已延後 {todo.defer_count} 次</p>}
      {todo.planned_date && <p className="text-xs text-muted">目前排在{dateLabel(todo.planned_date)}</p>}
      <div className="flex gap-2">
        <button onClick={save} className="rounded-lg bg-accent px-4 py-1.5 text-white">儲存</button>
        <button onClick={() => data.updateTodo(todo.id, { status: todo.status === "dropped" ? "open" : "dropped" }).then(onClose)} className="rounded-lg border border-line px-3 py-1.5">
          {todo.status === "dropped" ? "恢復" : "不做了"}
        </button>
        <button onClick={onClose} className="ml-auto text-muted">取消</button>
      </div>
    </div>
  );
}
