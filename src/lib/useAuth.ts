"use client";

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";

// 只有第一個登入的帳號能成為擁有者（資料庫 pa_profile 會擋第二個人）
export type OwnerState = "checking" | "owner" | "not_owner";

export function useAuth() {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [owner, setOwner] = useState<OwnerState>("checking");

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session) return;
    let active = true;
    (async () => {
      const { data } = await supabase.from("pa_profile").select("user_id").maybeSingle();
      let result: OwnerState = "owner";
      if (!data) {
        const { error } = await supabase.from("pa_profile").insert({});
        if (error) result = "not_owner";
      }
      if (active) setOwner(result);
    })();
    return () => {
      active = false;
    };
  }, [session]);

  return { loading, session, owner: session ? owner : "checking" };
}
