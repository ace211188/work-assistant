"use client";

import { useEffect, useRef, useState } from "react";
import { IconPlus, IconX, IconArrowUp } from "@tabler/icons-react";
import type { AssistantData } from "@/lib/useData";

export type Tab = "today" | "todos" | "settings";
const TABS: { key: Tab; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "todos", label: "Tasks" },
  { key: "settings", label: "Settings" },
];

// 底部浮起的工具列。按＋時整條工具列展開成輸入框（這個 App 唯一的招牌動畫），記完自動收回。
export default function BottomBar({ tab, onTab, data }: { tab: Tab; onTab: (t: Tab) => void; data: AssistantData }) {
  const [capturing, setCapturing] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (capturing) inputRef.current?.focus();
  }, [capturing]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const value = text.trim();
    if (!value) return;
    setBusy(true);
    if (await data.addInbox(value)) {
      setText("");
      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        setCapturing(false);
      }, 1100);
    }
    setBusy(false);
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 px-5 pb-[max(18px,env(safe-area-inset-bottom))]">
      <div
        className="pointer-events-auto mx-auto flex h-[62px] max-w-[536px] items-center rounded-[31px] bg-bar shadow-[0_10px_30px_-8px_rgb(0_0_0/0.45)]"
      >
        {capturing ? (
          <form onSubmit={submit} className="capture-open flex h-full w-full items-center gap-2 rounded-[31px] pl-5 pr-2">
            <input
              ref={inputRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={saved ? "記下了，下次整理時會排進去" : "想到什麼就記下來…"}
              aria-label="記一件事"
              className="min-w-0 flex-1 bg-transparent py-3 outline-none focus-visible:outline-none"
            />
            {text.trim() ? (
              <button disabled={busy} aria-label="記下" className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-full bg-fg text-ink">
                <IconArrowUp size={22} stroke={2} />
              </button>
            ) : (
              <button type="button" onClick={() => setCapturing(false)} aria-label="取消" className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-full">
                <IconX size={20} stroke={1.75} />
              </button>
            )}
          </form>
        ) : (
          <nav className="flex w-full items-center pl-3 pr-2">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => onTab(t.key)}
                aria-current={tab === t.key ? "page" : undefined}
                className={`flex h-[46px] flex-1 items-center justify-center font-[family-name:var(--font-garamond)] text-[12px] uppercase tracking-[0.16em] ${
                  tab === t.key ? "underline decoration-1 underline-offset-[6px]" : ""
                }`}
              >
                {t.label}
              </button>
            ))}
            <button
              onClick={() => setCapturing(true)}
              aria-label="記一件事"
              className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-full bg-fg text-ink transition-transform active:scale-95"
            >
              <IconPlus size={24} stroke={2} />
            </button>
          </nav>
        )}
      </div>
    </div>
  );
}
