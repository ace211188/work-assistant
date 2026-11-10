"use client";

import { useEffect, useRef, useState } from "react";
import { IconRefresh } from "@tabler/icons-react";
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/supabase";

// 「立即整理」：叫雲端排程馬上跑一輪（整理收件匣、做交辦、回應想法），不用等每 2 小時的定時。
// 排程大約要 2～5 分鐘；之後在 3、6 分鐘各通知畫面重新載入一次（pa-refresh 事件）。
export default function RunNow({ className = "" }: { className?: string }) {
  const [state, setState] = useState<"idle" | "busy" | "started" | "info" | "error">("idle");
  const [msg, setMsg] = useState("");
  const timers = useRef<number[]>([]);

  useEffect(() => () => timers.current.forEach((t) => clearTimeout(t)), []);

  async function run() {
    setState("busy");
    const { data } = await supabase.auth.getSession();
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/pa-run-now`, {
        method: "POST",
        headers: { Authorization: `Bearer ${data.session?.access_token ?? ""}`, apikey: SUPABASE_ANON_KEY },
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok) {
        setState("started");
        setMsg("開始整理了，大約 2～5 分鐘。做好的交辦會推播通知你。");
        timers.current = [3, 6].map((m) => window.setTimeout(() => window.dispatchEvent(new Event("pa-refresh")), m * 60_000));
      } else if (body.cooling) {
        setState("info");
        setMsg(`剛剛已經在整理了，${body.wait} 分鐘後可以再按一次。`);
      } else {
        setState("error");
        setMsg(body.error ?? "沒有啟動成功，請稍後再試。");
      }
    } catch {
      setState("error");
      setMsg("連不上網路，請稍後再試。");
    }
  }

  return (
    <div className={className}>
      <button onClick={run} disabled={state === "busy"} className="btn-quiet">
        <IconRefresh size={17} stroke={1.6} className={state === "busy" ? "animate-spin" : ""} />
        {state === "busy" ? "啟動中…" : "立即整理"}
      </button>
      {msg && <p className={`meta mt-2 ${state === "error" ? "text-[#ffd9cc]" : ""}`}>{msg}</p>}
    </div>
  );
}
