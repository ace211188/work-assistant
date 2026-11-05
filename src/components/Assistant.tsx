"use client";

import { useCallback, useEffect, useState } from "react";
import { IconChevronDown } from "@tabler/icons-react";
import { supabase } from "@/lib/supabase";
import type { Assignment, AssignmentMessage, AssignmentStatus, Brief, WeeklyContent } from "@/lib/types";

const STATUS_LABEL: Record<AssignmentStatus, string> = {
  queued: "排隊中",
  working: "處理中",
  needs_input: "等你回覆",
  done: "完成",
  cancelled: "取消",
};

const timeLabel = (iso: string) =>
  new Date(iso).toLocaleString("zh-TW", { timeZone: "Asia/Taipei", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });

// 交給助理：交辦、來回對話、成品、週報
export default function Assistant() {
  const [items, setItems] = useState<Assignment[]>([]);
  const [messages, setMessages] = useState<AssignmentMessage[]>([]);
  const [weekly, setWeekly] = useState<Brief<WeeklyContent> | null>(null);
  const [draft, setDraft] = useState("");
  const [open, setOpen] = useState<number | null>(null);

  const load = useCallback(async () => {
    const since = new Date(Date.now() - 14 * 86400_000).toISOString();
    const [a, w] = await Promise.all([
      supabase.from("pa_assignments").select("*").neq("status", "cancelled").gte("updated_at", since).order("updated_at", { ascending: false }),
      // 最近 8 天內的週報
      supabase
        .from("pa_briefs")
        .select("*")
        .eq("kind", "weekly")
        .gte("created_at", new Date(Date.now() - 8 * 86400_000).toISOString())
        .order("date", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    const list = (a.data as Assignment[]) ?? [];
    setItems(list);
    setWeekly((w.data as Brief<WeeklyContent>) ?? null);
    if (list.length) {
      const { data } = await supabase.from("pa_assignment_messages").select("*").in("assignment_id", list.map((x) => x.id)).order("created_at");
      setMessages((data as AssignmentMessage[]) ?? []);
    }
  }, []);

  useEffect(() => {
    // 載入交辦（非同步，結果回來才更新狀態）
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function assign(e: React.FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    const firstLine = text.split("\n")[0];
    await supabase.from("pa_assignments").insert({ title: firstLine.length > 40 ? `${firstLine.slice(0, 40)}…` : firstLine, detail: text, source: "app" });
    setDraft("");
    load();
  }

  const needs = items.filter((a) => a.status === "needs_input");
  const doing = items.filter((a) => a.status === "queued" || a.status === "working");
  const done = items.filter((a) => a.status === "done");

  const section = (title: string, list: Assignment[]) =>
    list.length > 0 && (
      <>
        <h2 className="sec">
          <span>{title}</span>
          <span className="num">{list.length}</span>
        </h2>
        <div className="space-y-2">
          {list.map((a) => (
            <AssignmentCard
              key={a.id}
              a={a}
              thread={messages.filter((m) => m.assignment_id === a.id)}
              open={open === a.id}
              onToggle={() => setOpen(open === a.id ? null : a.id)}
              onChange={load}
            />
          ))}
        </div>
      </>
    );

  return (
    <>
      <form onSubmit={assign} className="card mt-5 space-y-2">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={3}
          placeholder="交代一件事給助理，例如：幫我寫一封寒假班招生公告，強調小班制"
          aria-label="交代給助理的事"
          className="field leading-[1.8]"
        />
        <div className="flex items-center gap-3">
          <button className="btn" disabled={!draft.trim()}>
            交給助理
          </button>
          <span className="meta">每 2 小時處理一次，做好會通知你</span>
        </div>
      </form>

      {weekly?.content.report &&<WeeklyReport report={weekly.content.report} date={weekly.date} />}

      {section("Needs you", needs)}
      {section("In progress", doing)}
      {section("Done", done)}
      {items.length === 0 && <p className="meta mt-6 leading-relaxed">還沒有交辦的事。寫信、整理資料、查資料、排課檢查都可以交給助理。</p>}
    </>
  );
}

function AssignmentCard({
  a,
  thread,
  open,
  onToggle,
  onChange,
}: {
  a: Assignment;
  thread: AssignmentMessage[];
  open: boolean;
  onToggle: () => void;
  onChange: () => void;
}) {
  const [reply, setReply] = useState("");
  const [showResult, setShowResult] = useState(false);
  const [copied, setCopied] = useState(false);
  const last = [...thread].reverse().find((m) => m.author === "assistant");

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!reply.trim()) return;
    await supabase.from("pa_assignment_messages").insert({ assignment_id: a.id, author: "me", body: reply.trim() });
    // 回覆後重新排隊，助理下一輪接著做；推播狀態歸零，做好會再通知
    await supabase.from("pa_assignments").update({ status: "queued", notified_status: null }).eq("id", a.id);
    setReply("");
    onChange();
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(a.result ?? "");
      setCopied(true);
    } catch {
      setShowResult(true);
    }
  }

  return (
    <article className="card">
      <button onClick={onToggle} aria-expanded={open} className="flex min-h-11 w-full items-start justify-between gap-3 text-left">
        <span className="min-w-0">
          <span className="block leading-snug">{a.title}</span>
          <span className="meta mt-1 block">
            {STATUS_LABEL[a.status]}　{timeLabel(a.updated_at)}
          </span>
        </span>
        <IconChevronDown size={16} stroke={1.6} className={`mt-1 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {!open && last && <p className="mt-2 line-clamp-2 text-[14px] leading-[1.75]">{last.body}</p>}

      {open && (
        <div className="mt-3 space-y-3">
          {a.detail && a.detail !== a.title && <p className="border-l border-line pl-3 text-[14px] leading-[1.75] whitespace-pre-line">{a.detail}</p>}

          {a.result && (
            <div className="rounded-[4px] border border-line px-3 py-2.5">
              <button onClick={() => setShowResult(!showResult)} aria-expanded={showResult} className="flex min-h-11 w-full items-center justify-between gap-3 text-left font-medium">
                <span>{a.result_title ?? "成品"}</span>
                <IconChevronDown size={16} stroke={1.6} className={`shrink-0 transition-transform ${showResult ? "rotate-180" : ""}`} />
              </button>
              {showResult && <div className="mt-1 text-[14px] leading-[1.85] whitespace-pre-wrap select-text">{a.result}</div>}
              <button onClick={copy} className="btn-quiet mt-2">
                {copied ? "已複製" : "複製全文"}
              </button>
            </div>
          )}

          {thread.length > 0 && (
            <ul className="space-y-2">
              {thread.map((m) => (
                <li key={m.id} className={m.author === "me" ? "pl-6" : ""}>
                  <p className="meta">
                    {m.author === "me" ? "你" : "助理"}　{timeLabel(m.created_at)}
                  </p>
                  <p className="mt-0.5 text-[15px] leading-[1.8] whitespace-pre-line">{m.body}</p>
                </li>
              ))}
            </ul>
          )}

          {a.status !== "cancelled" && (
            <form onSubmit={send} className="space-y-2">
              <textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                rows={2}
                placeholder={a.status === "needs_input" ? "回答助理的問題…" : a.status === "done" ? "要修改哪裡？" : "補充說明…"}
                aria-label="回覆助理"
                className="field"
              />
              <div className="flex flex-wrap gap-2">
                <button className="btn" disabled={!reply.trim()}>
                  送出
                </button>
                {(a.status === "queued" || a.status === "needs_input") && (
                  <button
                    type="button"
                    onClick={() => supabase.from("pa_assignments").update({ status: "cancelled" }).eq("id", a.id).then(onChange)}
                    className="btn-quiet"
                  >
                    不用做了
                  </button>
                )}
              </div>
            </form>
          )}
        </div>
      )}
    </article>
  );
}

function WeeklyReport({ report, date }: { report: string; date: string }) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState(false);

  async function save() {
    if (!note.trim()) return;
    await supabase.from("pa_staff_rules").insert({ content: note.trim() });
    setNote("");
    setSaved(true);
  }

  return (
    <>
      <h2 className="sec">
        <span>Weekly report</span>
        <span className="meta">{date.slice(5).replace("-", "/")}</span>
      </h2>
      <article className="card">
        <div className={`text-[15px] leading-[1.85] whitespace-pre-wrap ${open ? "" : "line-clamp-6"}`}>{report}</div>
        <button onClick={() => setOpen(!open)} className="btn-quiet mt-2">
          {open ? "收起" : "看完整週報"}
        </button>
        <div className="mt-4 space-y-2 border-t border-line pt-3">
          <p className="meta">給助理的意見：哪裡做得好、哪裡要改。會寫進它的工作守則，之後都照做。</p>
          <textarea value={note} onChange={(e) => { setNote(e.target.value); setSaved(false); }} rows={2} aria-label="給助理的意見" className="field" />
          <div className="flex items-center gap-3">
            <button onClick={save} disabled={!note.trim()} className="btn-quiet">
              寫進工作守則
            </button>
            {saved && <span className="meta">已記下</span>}
          </div>
        </div>
      </article>
    </>
  );
}
