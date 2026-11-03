"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Feedback } from "@/lib/types";

const SOURCE_LABEL: Record<Feedback["source_type"], string> = {
  idea: "你記下的想法",
  thought_comment: "你對今日思考的感想",
  reflection: "你晚上寫的心得",
  discussion: "你和 Claude 聊完的結論",
};

// 助理的回饋：原文、回饋、追問；建議的事按「加成待辦」才會變成待辦，按「收到」就收起來
export default function FeedbackList({ list, onTodoAdded }: { list: Feedback[]; onTodoAdded: () => void }) {
  const [items, setItems] = useState(list);

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

  const visible = items.filter((f) => !f.dismissed_at);
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
            {f.question && <p className="mt-3 border-l border-fg pl-3 text-[16px] leading-[1.75] font-medium">{f.question}</p>}
            {f.action && (
              <p className="mt-3 text-[15px] leading-[1.75]">
                <span className="meta">可以做的事　</span>
                {f.action}
              </p>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-2">
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
