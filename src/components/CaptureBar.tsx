"use client";

import { useState } from "react";
import type { AssistantData } from "@/lib/useData";

// 快速輸入：一句話就好，下一次排程（7:00／22:00）由 AI 整理成待辦
export default function CaptureBar({ data }: { data: AssistantData }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const value = text.trim();
    if (!value) return;
    setBusy(true);
    if (await data.addInbox(value)) {
      setText("");
      setFlash(true);
      setTimeout(() => setFlash(false), 1500);
    }
    setBusy(false);
  }

  return (
    <form onSubmit={submit} className="flex gap-2">
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={flash ? "記下了 ✓ 下次整理時會排進去" : "想到什麼就記下來…例如「週五前印好體驗券」"}
        className="min-w-0 flex-1 rounded-full border border-line bg-card px-4 py-2.5 outline-none focus:border-accent"
      />
      <button
        disabled={busy || !text.trim()}
        className="shrink-0 rounded-full bg-accent px-4 font-semibold text-white disabled:opacity-40"
      >
        記
      </button>
    </form>
  );
}
