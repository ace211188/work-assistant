"use client";

import { IconCheck } from "@tabler/icons-react";
import { effectiveUrgency, URGENCY_LABEL } from "@/lib/useData";
import { dateLabel, hhmm } from "@/lib/time";
import type { Todo } from "@/lib/types";

// 只標出「急」；完成或不做的待辦不再標
export function UrgencyTag({ todo }: { todo: Todo }) {
  if (todo.status !== "open" || effectiveUrgency(todo) !== "high") return null;
  return <span className="shrink-0 rounded-[4px] bg-fg px-1.5 text-[12px] leading-5 text-ink">{URGENCY_LABEL.high}</span>;
}

// 一列待辦：左邊的圓圈就是勾選鈕（點擊範圍 44px）；未完成是空心圈，完成後填白、打勾並劃線
export default function TodoRow({
  todo,
  onToggle,
  extra,
  onClick,
  time,
}: {
  todo: Todo;
  onToggle: () => void;
  extra?: React.ReactNode;
  onClick?: () => void;
  time?: string;
}) {
  const done = todo.status === "done";
  const dropped = todo.status === "dropped";
  // 右側只放開始時間；截止日放到標題下一行，避免擠壓標題
  const when = time ?? (todo.planned_start ? hhmm(todo.planned_start) : "");
  const due = todo.status === "open" && todo.due_date ? `${dateLabel(todo.due_date)}截止` : "";

  return (
    <div className="flex items-start">
      <button
        onClick={onToggle}
        aria-label={done ? `把「${todo.title}」標回未完成` : `完成「${todo.title}」`}
        aria-pressed={done}
        className="check -ml-2.5 flex h-11 w-11 shrink-0 items-center justify-center"
      >
        <span className={`flex h-[22px] w-[22px] items-center justify-center rounded-full border-[1.5px] border-fg transition-colors ${done ? "bg-fg text-ink" : "text-transparent"}`}>
          <IconCheck size={14} stroke={2.4} />
        </span>
      </button>
      <div className={`min-w-0 flex-1 py-[11px] ${onClick ? "cursor-pointer" : ""}`} onClick={onClick}>
        <div className="flex items-start gap-3">
          <span className={`min-w-0 flex-1 leading-snug ${done || dropped ? "line-through decoration-1" : ""}`}>{todo.title}</span>
          <UrgencyTag todo={todo} />
          {when && <span className="num shrink-0 text-[15px] leading-snug">{when}</span>}
        </div>
        {due && !extra && <p className="meta mt-0.5">{due}</p>}
        {extra}
      </div>
    </div>
  );
}
