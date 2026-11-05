"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/useAuth";
import { useAssistantData } from "@/lib/useData";
import { supabase } from "@/lib/supabase";
import { rebindPush } from "@/lib/push";
import Login from "@/components/Login";
import Today from "@/components/Today";
import Todos from "@/components/Todos";
import Settings from "@/components/Settings";
import BottomBar, { type Tab } from "@/components/BottomBar";

const BASE = process.env.NODE_ENV === "production" ? "/work-assistant" : "";

export default function Home() {
  const { loading, session, owner } = useAuth();
  const data = useAssistantData(owner === "owner");
  const [tab, setTab] = useState<Tab>("today");
  const [todayMode, setTodayMode] = useState<"morning" | "evening" | undefined>();
  const [todosMode, setTodosMode] = useState<"mine" | "assistant">("mine");

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register(`${BASE}/sw.js`, { scope: `${BASE}/` }).catch(() => {});
    }
    // 網址的 #tasks／#assistant／#settings／#morning／#evening 直接開到那個畫面（例如推播點開）
    const applyHash = () => {
      const hash = window.location.hash.slice(1);
      if (hash === "tasks" || hash === "assistant") {
        setTab("todos");
        setTodosMode(hash === "assistant" ? "assistant" : "mine");
      } else if (hash === "settings") setTab("settings");
      else if (hash === "morning" || hash === "evening") {
        setTab("today");
        setTodayMode(hash);
      }
    };
    applyHash();
    window.addEventListener("hashchange", applyHash);
    return () => window.removeEventListener("hashchange", applyHash);
  }, []);

  useEffect(() => {
    if (owner === "owner") rebindPush().catch(() => {});
  }, [owner]);

  if (loading) return null;
  if (!session) return <Login />;
  if (owner === "checking") return null;
  if (owner === "not_owner") {
    return (
      <main className="mx-auto max-w-sm px-6 py-24 text-center">
        <p>這個助理只給擁有者使用。</p>
        <button onClick={() => supabase.auth.signOut()} className="btn-quiet mt-6">
          登出
        </button>
      </main>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-5 pt-[max(20px,env(safe-area-inset-top))] pb-36">
      {/* key 換了就重新播放淡入動畫 */}
      <div key={`${tab}-${todayMode}-${todosMode}`} className="view-enter">
        {tab === "today" && <Today data={data} initialMode={todayMode} />}
        {tab === "todos" && <Todos data={data} initialMode={todosMode} />}
        {tab === "settings" && <Settings />}
      </div>
      <BottomBar tab={tab} onTab={setTab} data={data} />
    </div>
  );
}
