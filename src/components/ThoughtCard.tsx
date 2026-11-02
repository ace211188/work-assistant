"use client";

import { useState } from "react";
import { IconThumbUp, IconThumbDown, IconPencil, IconMessageCircle, IconArrowUpRight } from "@tabler/icons-react";
import { supabase } from "@/lib/supabase";
import { discussThoughtUrl } from "@/lib/claude";
import type { Thought } from "@/lib/types";

export default function ThoughtCard({ thought, direction }: { thought: Thought; direction: string | null }) {
  const [t, setT] = useState(thought);
  const [commenting, setCommenting] = useState(false);
  const [comment, setComment] = useState(thought.comment ?? "");
  const [discussion, setDiscussion] = useState("");
  const [showDiscussion, setShowDiscussion] = useState(false);
  const [savedDiscussion, setSavedDiscussion] = useState(false);

  async function patch(values: Partial<Thought>) {
    setT((prev) => ({ ...prev, ...values }));
    await supabase.from("pa_thoughts").update(values).eq("id", t.id);
  }

  async function saveComment() {
    await patch({ comment: comment.trim() || null });
    setCommenting(false);
  }

  async function saveDiscussion() {
    if (!discussion.trim()) return;
    await supabase.from("pa_discussions").insert({ thought_id: t.id, summary: discussion.trim() });
    setDiscussion("");
    setShowDiscussion(false);
    setSavedDiscussion(true);
  }

  return (
    <article className="card px-[18px] py-[18px]">
      <h2 className="text-[19px] leading-[1.6] font-semibold">{t.title}</h2>
      <p className="mt-3 text-[15px] leading-[1.9] whitespace-pre-line">{t.body}</p>
      {t.question && <p className="mt-4 border-l border-fg pl-3 text-[17px] leading-[1.75] font-medium">{t.question}</p>}
      {t.why_relevant && <p className="meta mt-4 leading-relaxed">{t.why_relevant}</p>}
      {t.source_url && (
        <a href={t.source_url} target="_blank" rel="noreferrer" className="meta mt-2 inline-flex items-center gap-1 underline underline-offset-4">
          Read the source <IconArrowUpRight size={14} stroke={1.75} />
        </a>
      )}

      <div className="-mx-2 mt-3 flex flex-wrap items-center">
        <button
          onClick={() => patch({ feedback: t.feedback === "useful" ? null : "useful" })}
          aria-pressed={t.feedback === "useful"}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-[6px] px-2 text-[14px] aria-pressed:bg-fg aria-pressed:text-ink"
        >
          <IconThumbUp size={17} stroke={1.6} /> 有用
        </button>
        <button
          onClick={() => patch({ feedback: t.feedback === "not_useful" ? null : "not_useful" })}
          aria-pressed={t.feedback === "not_useful"}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-[6px] px-2 text-[14px] aria-pressed:bg-fg aria-pressed:text-ink"
        >
          <IconThumbDown size={17} stroke={1.6} /> 沒用
        </button>
        <button onClick={() => setCommenting((v) => !v)} className="inline-flex min-h-11 items-center gap-1.5 px-2 text-[14px]">
          <IconPencil size={17} stroke={1.6} /> {t.comment ? "改感想" : "感想"}
        </button>
        <a
          href={discussThoughtUrl(t, direction)}
          onClick={() => setShowDiscussion(true)}
          className="ml-auto inline-flex min-h-11 items-center gap-1.5 px-2 text-[14px] font-semibold"
        >
          <IconMessageCircle size={17} stroke={1.6} /> 和 Claude 聊
        </a>
      </div>

      {t.comment && !commenting && <p className="meta mt-2">你的感想：{t.comment}</p>}

      {commenting && (
        <div className="mt-2 space-y-2">
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={2}
            placeholder="一句話就好，助理會參考你的感想調整內容"
            className="field"
          />
          <button onClick={saveComment} className="btn">儲存感想</button>
        </div>
      )}

      {showDiscussion && (
        <div className="mt-4 space-y-2 border-t border-line pt-4">
          <p className="meta">聊完之後，把 Claude 整理的結論貼回來：</p>
          <textarea value={discussion} onChange={(e) => setDiscussion(e.target.value)} rows={3} className="field" />
          <button onClick={saveDiscussion} className="btn">存回助理</button>
        </div>
      )}
      {savedDiscussion && <p className="meta mt-3">已存下這次的討論結論。</p>}
    </article>
  );
}
