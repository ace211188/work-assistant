"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabase";
import { taipeiDate } from "./time";
import type { InboxItem, Todo } from "./types";

// 待辦和收件匣在「今天」「待辦」「快速輸入」之間共用
export function useAssistantData(enabled: boolean) {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [inbox, setInbox] = useState<InboxItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  const reload = useCallback(async () => {
    const since = taipeiDate(-30);
    const [t, i] = await Promise.all([
      supabase
        .from("pa_todos")
        .select("*")
        .or(`status.eq.open,completed_at.gte.${since},updated_at.gte.${since}`)
        .order("created_at", { ascending: false }),
      supabase.from("pa_inbox").select("*").is("processed_at", null).order("created_at", { ascending: false }),
    ]);
    setTodos((t.data as Todo[]) ?? []);
    setInbox((i.data as InboxItem[]) ?? []);
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    // 第一次載入資料（非同步，結果回來才更新狀態）
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reload();
    const onFocus = () => reload();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [enabled, reload]);

  // 先更新畫面再寫入資料庫，失敗就重新載入
  const updateTodo = useCallback(
    async (id: number, patch: Partial<Todo>) => {
      // completed_at 由資料庫觸發器設定；畫面上先跟著狀態更新
      const local = patch.status ? { ...patch, completed_at: patch.status === "done" ? new Date().toISOString() : null } : patch;
      setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, ...local } : t)));
      const { error } = await supabase.from("pa_todos").update(patch).eq("id", id);
      if (error) reload();
    },
    [reload]
  );

  const addInbox = useCallback(async (text: string) => {
    const { data, error } = await supabase.from("pa_inbox").insert({ text }).select().single();
    if (!error && data) setInbox((prev) => [data as InboxItem, ...prev]);
    return !error;
  }, []);

  return { todos, inbox, loaded, reload, updateTodo, addInbox };
}

export type AssistantData = ReturnType<typeof useAssistantData>;

export function effectiveUrgency(t: Todo) {
  return t.urgency_override ?? t.urgency_ai;
}

export const URGENCY_LABEL = { high: "急", medium: "中", low: "緩" } as const;
export const URGENCY_ORDER = { high: 0, medium: 1, low: 2 } as const;

export function sortByUrgency(list: Todo[]) {
  return [...list].sort((a, b) => {
    const ua = effectiveUrgency(a), ub = effectiveUrgency(b);
    const oa = ua ? URGENCY_ORDER[ua] : 3, ob = ub ? URGENCY_ORDER[ub] : 3;
    if (oa !== ob) return oa - ob;
    return (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999");
  });
}
