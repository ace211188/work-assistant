"use client";

import { useState } from "react";
import { IconX } from "@tabler/icons-react";
import { supabase } from "@/lib/supabase";
import { dateLabel } from "@/lib/time";
import { effectiveUrgency, sortByUrgency, URGENCY_LABEL, type AssistantData } from "@/lib/useData";
import type { Todo, TodoStatus, Urgency } from "@/lib/types";
import Masthead from "./Masthead";
import TodoRow from "./TodoRow";
import Assistant from "./Assistant";

const FILTERS: { key: TodoStatus; label: string }[] = [
  { key: "open", label: "Open" },
  { key: "done", label: "Done" },
  { key: "dropped", label: "Dropped" },
];

export default function Todos({ data, initialMode = "mine" }: { data: AssistantData; initialMode?: "mine" | "assistant" }) {
  const [mode, setMode] = useState(initialMode);

  return (
    <div>
      <Masthead
        title="Tasks"
        subtitle={mode === "mine" ? `${data.todos.filter((t) => t.status === "open").length} open` : "交給助理"}
        aside={
          <div role="tablist" aria-label="我的待辦或交給助理" className="relative grid shrink-0 grid-cols-2 pb-1">
            {(["mine", "assistant"] as const).map((m) => (
              <button key={m} role="tab" aria-selected={mode === m} onClick={() => setMode(m)} className="meta min-h-11 px-2">
                {m === "mine" ? "Mine" : "Assistant"}
              </button>
            ))}
            <span
              aria-hidden
              className="slide-indicator pointer-events-none absolute bottom-[14px] left-0 flex w-1/2 justify-center"
              style={{ transform: `translateX(${mode === "mine" ? 0 : 100}%)` }}
            >
              <span className="h-px w-12 bg-fg" />
            </span>
          </div>
        }
      />
      <div key={mode} className="view-enter">
        {mode === "mine" ? <MyTodos data={data} /> : <Assistant />}
      </div>
    </div>
  );
}

function MyTodos({ data }: { data: AssistantData }) {
  const [filter, setFilter] = useState<TodoStatus>("open");
  const [category, setCategory] = useState<string>("");
  const [editing, setEditing] = useState<number | null>(null);

  const categories = [...new Set(data.todos.map((t) => t.category).filter((c): c is string => !!c))];
  const list = sortByUrgency(data.todos.filter((t) => t.status === filter && (!category || t.category === category)));
  const toggle = (t: Todo) => data.updateTodo(t.id, { status: t.status === "done" ? "open" : "done" });

  return (
    <>

      {data.inbox.length > 0 && (
        <>
          <h2 className="sec">
            <span>Waiting to be sorted</span>
            <span className="num not-italic">{data.inbox.length}</span>
          </h2>
          <div className="card py-1">
            <p className="meta pt-2 leading-relaxed">助理每 2 小時整理一次：判斷日期、分類和緊急程度；「幫我…」的會交給助理做。</p>
            <ul className="divide-y divide-line">
              {data.inbox.map((i) => (
                <li key={i.id} className="flex items-center gap-2">
                  <span className="min-w-0 flex-1 py-3 leading-snug">{i.text}</span>
                  <button
                    onClick={async () => {
                      await supabase.from("pa_inbox").delete().eq("id", i.id);
                      data.reload();
                    }}
                    aria-label={`刪除「${i.text}」`}
                    className="flex h-11 w-11 shrink-0 items-center justify-center"
                  >
                    <IconX size={18} stroke={1.6} />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}

      <div role="tablist" aria-label="篩選" className="sec">
        <div className="flex gap-4">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              role="tab"
              aria-selected={filter === f.key}
              onClick={() => setFilter(f.key)}
              className={`min-h-11 ${filter === f.key ? "underline decoration-1 underline-offset-[6px]" : ""}`}
            >
              {f.label} <span className="num not-italic">{data.todos.filter((t) => t.status === f.key).length}</span>
            </button>
          ))}
        </div>
      </div>

      {categories.length > 0 && (
        <div className="no-scrollbar -mx-1 mb-3 flex gap-1 overflow-x-auto px-1">
          <button onClick={() => setCategory("")} aria-pressed={!category} className="btn-quiet shrink-0 text-[14px]">全部</button>
          {categories.map((c) => (
            <button key={c} onClick={() => setCategory(c)} aria-pressed={category === c} className="btn-quiet shrink-0 text-[14px]">
              {c}
            </button>
          ))}
        </div>
      )}

      <div key={`${filter}-${category}`} className="view-enter card divide-y divide-line py-1">
        {list.map((t) => (
          <div key={t.id}>
            <TodoRow todo={t} onToggle={() => toggle(t)} onClick={() => setEditing(editing === t.id ? null : t.id)} />
            {editing === t.id && <TodoEditor todo={t} data={data} onClose={() => setEditing(null)} />}
          </div>
        ))}
        {list.length === 0 && <p className="py-3">這裡是空的。</p>}
      </div>
      <p className="meta mt-3 leading-relaxed">點一下待辦可以改緊急程度、日期和分類；助理會從你的修改學習你的習慣。</p>
    </>
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

  return (
    <div className="mb-3 space-y-3 border-t border-line pt-3">
      <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} aria-label="待辦名稱" className="field" />
      <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} placeholder="備註" aria-label="備註" className="field" />
      <div className="grid grid-cols-2 gap-3">
        <label className="space-y-1">
          <span className="meta">緊急程度</span>
          <select value={form.urgency} onChange={(e) => setForm({ ...form, urgency: e.target.value as Urgency | "" })} className="field">
            <option value="">照 AI 判斷{todo.urgency_ai ? `（${URGENCY_LABEL[todo.urgency_ai]}）` : ""}</option>
            <option value="high">急</option>
            <option value="medium">中</option>
            <option value="low">緩</option>
          </select>
        </label>
        <label className="space-y-1">
          <span className="meta">分類</span>
          <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="field" />
        </label>
        <label className="space-y-1">
          <span className="meta">截止日</span>
          <input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} className="field" />
        </label>
        <label className="space-y-1">
          <span className="meta">預計哪天做</span>
          <input type="date" value={form.planned_date} onChange={(e) => setForm({ ...form, planned_date: e.target.value })} className="field" />
        </label>
      </div>
      {todo.urgency_reason && (
        <p className="meta leading-relaxed">
          AI 判斷{effectiveUrgency(todo) ? `「${URGENCY_LABEL[todo.urgency_ai ?? "medium"]}」` : ""}的理由：{todo.urgency_reason}
        </p>
      )}
      {(todo.defer_count > 0 || todo.planned_date) && (
        <p className="meta">
          {todo.defer_count > 0 && `已延後 ${todo.defer_count} 次。`}
          {todo.planned_date && `目前排在${dateLabel(todo.planned_date)}。`}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <button onClick={save} className="btn">儲存</button>
        <button onClick={() => data.updateTodo(todo.id, { status: todo.status === "dropped" ? "open" : "dropped" }).then(onClose)} className="btn-quiet">
          {todo.status === "dropped" ? "恢復" : "不做了"}
        </button>
        <button onClick={onClose} className="btn-quiet ml-auto">取消</button>
      </div>
    </div>
  );
}
