"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { discussThoughtUrl } from "@/lib/claude";
import type { Thought } from "@/lib/types";

const FORMAT_LABEL: Record<Thought["format"], string> = {
  question: "今天的好問題",
  article: "外部觀點",
  direction: "回顧方向",
  concept: "一個概念",
};

export default function ThoughtCard({ thought, direction }: { thought: Thought; direction: string | null }) {
  const [t, setT] = useState(thought);
  const [commenting, setCommenting] = useState(false);
  const [comment, setComment] = useState(thought.comment ?? "");
  const [saving, setSaving] = useState(false);
  const [discussion, setDiscussion] = useState("");
  const [showDiscussion, setShowDiscussion] = useState(false);
  const [savedDiscussion, setSavedDiscussion] = useState(false);

  async function patch(values: Partial<Thought>) {
    setT((prev) => ({ ...prev, ...values }));
    await supabase.from("pa_thoughts").update(values).eq("id", t.id);
  }

  async function saveComment() {
    setSaving(true);
    await patch({ comment: comment.trim() || null });
    setSaving(false);
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
    <section className="rounded-2xl border border-line bg-card p-5">
      <div className="text-xs font-semibold tracking-wide text-accent">
        {FORMAT_LABEL[t.format]}
        {t.topic ? `・${t.topic}` : ""}
      </div>
      <h2 className="mt-2 text-lg leading-snug font-bold">{t.title}</h2>
      <p className="mt-3 leading-relaxed whitespace-pre-line">{t.body}</p>
      {t.question && (
        <p className="mt-4 rounded-xl bg-accent-soft px-4 py-3 font-medium leading-relaxed">🤔 {t.question}</p>
      )}
      {t.why_relevant && <p className="mt-3 text-sm text-muted">為什麼給你：{t.why_relevant}</p>}
      {t.source_url && (
        <a href={t.source_url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm text-accent underline">
          看原文
        </a>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          onClick={() => patch({ feedback: t.feedback === "useful" ? null : "useful" })}
          className={`rounded-full border px-3 py-1.5 text-sm ${t.feedback === "useful" ? "border-ok bg-ok text-white" : "border-line"}`}
        >
          👍 有用
        </button>
        <button
          onClick={() => patch({ feedback: t.feedback === "not_useful" ? null : "not_useful" })}
          className={`rounded-full border px-3 py-1.5 text-sm ${t.feedback === "not_useful" ? "border-muted bg-muted text-white" : "border-line"}`}
        >
          👎 沒用
        </button>
        <button onClick={() => setCommenting((v) => !v)} className="rounded-full border border-line px-3 py-1.5 text-sm">
          ✏️ {t.comment ? "改感想" : "寫感想"}
        </button>
        <a
          href={discussThoughtUrl(t, direction)}
          onClick={() => setShowDiscussion(true)}
          className="rounded-full border border-accent px-3 py-1.5 text-sm text-accent"
        >
          💬 和 Claude 討論
        </a>
      </div>

      {t.comment && !commenting && <p className="mt-3 text-sm text-muted">你的感想：{t.comment}</p>}

      {commenting && (
        <div className="mt-3">
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={2}
            placeholder="一句話就好，助理會參考你的感想調整內容"
            className="w-full rounded-xl border border-line bg-background px-3 py-2 outline-none focus:border-accent"
          />
          <button onClick={saveComment} disabled={saving} className="mt-2 rounded-lg bg-accent px-4 py-2 text-sm text-white">
            儲存
          </button>
        </div>
      )}

      {showDiscussion && (
        <div className="mt-4 border-t border-line pt-4">
          <p className="text-sm text-muted">討論完，把 Claude 整理的結論貼回來：</p>
          <textarea
            value={discussion}
            onChange={(e) => setDiscussion(e.target.value)}
            rows={3}
            className="mt-2 w-full rounded-xl border border-line bg-background px-3 py-2 outline-none focus:border-accent"
          />
          <button onClick={saveDiscussion} className="mt-2 rounded-lg bg-accent px-4 py-2 text-sm text-white">
            存回助理
          </button>
        </div>
      )}
      {savedDiscussion && <p className="mt-3 text-sm text-ok">已存下討論結論 ✓</p>}
    </section>
  );
}
