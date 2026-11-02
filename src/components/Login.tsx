"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function Login() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMessage({ text: "登入失敗：Email 或密碼不對", error: true });
    } else {
      // 確認信的連結點完要回到這個 App；不指定的話 Supabase 會導回後台的 Site URL（預設 localhost）
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin + window.location.pathname },
      });
      if (error) setMessage({ text: `註冊失敗：${error.message}`, error: true });
      else if (!data.session) setMessage({ text: "註冊成功！請到信箱點確認信，再回來登入。", error: false });
    }
    setBusy(false);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4">
      <h1 className="text-2xl font-bold">個人助理</h1>
      <p className="mt-1 mb-8 text-sm text-muted">先全局思考，再看待辦。</p>

      <form onSubmit={submit} className="space-y-3">
        <input
          type="email"
          required
          autoComplete="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-xl border border-line bg-card px-4 py-3 outline-none focus:border-accent"
        />
        <input
          type="password"
          required
          minLength={8}
          autoComplete={mode === "signin" ? "current-password" : "new-password"}
          placeholder={mode === "signin" ? "密碼" : "設定密碼（至少 8 碼）"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-xl border border-line bg-card px-4 py-3 outline-none focus:border-accent"
        />
        <button
          disabled={busy}
          className="w-full rounded-xl bg-accent py-3 font-semibold text-white disabled:opacity-50"
        >
          {busy ? "處理中…" : mode === "signin" ? "登入" : "註冊"}
        </button>
      </form>

      {message && <p className={`mt-4 text-sm ${message.error ? "text-accent" : "text-ok"}`}>{message.text}</p>}

      <button
        onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
        className="mt-6 text-sm text-muted underline"
      >
        {mode === "signin" ? "第一次使用？註冊帳號" : "已經有帳號？登入"}
      </button>
    </main>
  );
}
