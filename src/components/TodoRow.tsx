"use client";

import { effectiveUrgency, URGENCY_LABEL } from "@/lib/useData";
import { dateLabel, hhmm } from "@/lib/time";
import type { Todo } from "@/lib/types";

const URGENCY_STYLE = {
  high: "bg-accent text-white",
  medium: "bg-warn/20 text-warn",
  low: "bg-line text-muted",
} as const;

export function UrgencyBadge({ todo }: { todo: Todo }) {
  const u = effectiveUrgency(todo);
  if (!u) return null;
  return <span className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${URGENCY_STYLE[u]}`}>{URGENCY_LABEL[u]}</span>;
}

export default function TodoRow({
  todo,
  onToggle,
  extra,
  onClick,
}: {
  todo: Todo;
  onToggle: () => void;
  extra?: React.ReactNode;
  onClick?: () => void;
}) {
  const done = todo.status === "done";
  const meta = [
    todo.planned_start ? `${hhmm(todo.planned_start)}${todo.planned_end ? `–${hhmm(todo.planned_end)}` : ""}` : "",
    todo.due_date ? `${dateLabel(todo.due_date)}截止` : "",
    todo.category ?? "",
  ].filter(Boolean);

  return (
    <div className="flex items-start gap-3 py-2.5">
      <button
        onClick={onToggle}
        aria-label={done ? "標記為未完成" : "標記為完成"}
        className={`mt-0.5 h-5 w-5 shrink-0 rounded-full border-2 ${done ? "border-ok bg-ok" : "border-muted"}`}
      >
        {done && <span className="block text-center text-[11px] leading-4 text-white">✓</span>}
      </button>
      <div className="min-w-0 flex-1" onClick={onClick}>
        <div className={`flex items-center gap-2 ${done ? "text-muted line-through" : ""} ${todo.status === "dropped" ? "text-muted line-through" : ""}`}>
          <UrgencyBadge todo={todo} />
          <span className="leading-snug">{todo.title}</span>
        </div>
        {meta.length > 0 && <div className="mt-0.5 text-xs text-muted">{meta.join("・")}</div>}
        {extra}
      </div>
    </div>
  );
}
