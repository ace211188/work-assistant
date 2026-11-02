"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/useAuth";
import { useAssistantData } from "@/lib/useData";
import { supabase } from "@/lib/supabase";
import Login from "@/components/Login";
import Today from "@/components/Today";
import Todos from "@/components/Todos";
import Settings from "@/components/Settings";
import CaptureBar from "@/components/CaptureBar";

const BASE = process.env.NODE_ENV === "production" ? "/work-assistant" : "";

type Tab = "today" | "todos" | "settings";
const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: "today", label: "今天", icon: "☀️" },
  { key: "todos", label: "待辦", icon: "✅" },
  { key: "settings", label: "設定", icon: "⚙️" },
];

export default function Home() {
  const { loading, session, owner } = useAuth();
  const data = useAssistantData(owner === "owner");
  const [tab, setTab] = useState<Tab>("today");

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register(`${BASE}/sw.js`, { scope: `${BASE}/` }).catch(() => {});
    }
  }, []);

  if (loading) return null;
  if (!session) return <Login />;
  if (owner === "checking") return null;
  if (owner === "not_owner") {
    return (
      <main className="mx-auto max-w-sm px-4 py-24 text-center">
        <p>這個助理只給擁有者使用。</p>
        <button onClick={() => supabase.auth.signOut()} className="mt-6 text-sm text-muted underline">
          登出
        </button>
      </main>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-4 pt-[max(20px,env(safe-area-inset-top))] pb-44">
      {tab === "today" && <Today data={data} />}
      {tab === "todos" && <Todos data={data} />}
      {tab === "settings" && <Settings />}

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-background/95 backdrop-blur">
        <div className="mx-auto max-w-xl px-4 pt-3">
          <CaptureBar data={data} />
        </div>
        <nav className="mx-auto flex max-w-xl pb-[max(8px,env(safe-area-inset-bottom))]">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 py-2 text-xs ${tab === t.key ? "font-semibold text-accent" : "text-muted"}`}
            >
              <div className="text-lg leading-6">{t.icon}</div>
              {t.label}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}
