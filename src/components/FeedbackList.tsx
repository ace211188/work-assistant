"use client";

import { useState } from "react";
import { IconChevronDown } from "@tabler/icons-react";
import { supabase } from "@/lib/supabase";
import type { Feedback } from "@/lib/types";

const SOURCE_LABEL: Record<Feedback["source_type"], string> = {
  idea: "你記下的想法",
  thought_comment: "你對今日思考的感想",
  reflection: "你晚上寫的心得",
  discussion: "你和 Claude 聊完的結論",
};

// 助理的回饋：原文、回饋、追問；請求的成品可以展開全文、複製；
// 建議的事按「加成待辦」才會變成待辦，按「收到」就收起來
export default function FeedbackList({ list, onTodoAdded }: { list: Feedback[]; onTodoAdded: () => void }) {
  const [items, setItems] = useState(list);
  const [open, setOpen] = useState<number | null>(null);
  const [copied, setCopied] = useState<number | null>(null);

  async function copy(f: Feedback) {
    try {
      await navigator.clipboard.writeText(f.document ?? "");
      setCopied(f.id);
    } catch {
      setOpen(f.id); // 沒辦法自動複製就展開全文，讓他長按選取
    }
  }

  async function patch(id: number, values: Partial<Feedback>) {
    setItems((prev) => prev.map((f) => (f.id === id ? { ...f, ...values } : f)));
    await supabase.from("pa_feedback").update(values).eq("id", id);
  }

  async function addTodo(f: Feedback) {
    const { data } = await supabase.from("pa_todos").insert({ title: f.action, category: "其他" }).select("id").single();
    if (data) {
      await patch(f.id, { action_todo_id: data.id });
      onTodoAdded();
    }
  }

  const visible = items.filter((f) => !f.dismissed_at && f.kind !== "skip");
  if (visible.length === 0) return null;

  return (
    <>
      <h2 className="sec">
        <span>Replies</span>
        <span className="num">{visible.length}</span>
      </h2>
      <div className="space-y-2">
        {visible.map((f) => (
          <article key={f.id} className="card">
            <p className="meta">{SOURCE_LABEL[f.source_type]}</p>
            <p className="mt-1.5 line-clamp-3 border-l border-line pl-3 text-[14px] leading-[1.75]">{f.source_text}</p>
            <p className="mt-3 text-[15px] leading-[1.9] whitespace-pre-line">{f.body}</p>
            {f.document && (
              <div className="mt-3 rounded-[4px] border border-line px-3 py-2.5">
                <button
                  onClick={() => setOpen(open === f.id ? null : f.id)}
                  aria-expanded={open === f.id}
                  className="flex min-h-11 w-full items-center justify-between gap-3 text-left text-[15px] font-medium"
                >
                  <span>{f.document_title ?? "幫你做好的內容"}</span>
                  <IconChevronDown size={16} stroke={1.6} className={`shrink-0 transition-transform ${open === f.id ? "rotate-180" : ""}`} />
                </button>
                {open === f.id && <div className="mt-1 text-[14px] leading-[1.85] whitespace-pre-wrap select-text">{f.document}</div>}
                <button onClick={() => copy(f)} className="btn-quiet mt-2">
                  {copied === f.id ? "已複製" : "複製全文"}
                </button>
              </div>
            )}
            {f.question && <p className="mt-3 border-l border-fg pl-3 text-[16px] leading-[1.75] font-medium">{f.question}</p>}
            {f.action && (
              <p className="mt-3 text-[15px] leading-[1.75]">
                <span className="meta">可以做的事　</span>
                {f.action}
              </p>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {f.assignment_id && (
                <button onClick={() => (window.location.hash = "#assistant")} className="btn-quiet">
                  看成品
                </button>
              )}
              {f.action &&
                (f.action_todo_id ? (
                  <span className="meta">已加成待辦</span>
                ) : (
                  <button onClick={() => addTodo(f)} className="btn-quiet">
                    加成待辦
                  </button>
                ))}
              <button onClick={() => patch(f.id, { dismissed_at: new Date().toISOString() })} className="btn-quiet">
                收到
              </button>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
