"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function Login() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMessage("登入失敗：Email 或密碼不對，請再確認一次。");
    } else {
      // 確認信的連結點完要回到這個 App；不指定的話 Supabase 會導回後台的 Site URL（預設 localhost）
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin + window.location.pathname },
      });
      if (error) setMessage(`註冊失敗：${error.message}`);
      else if (!data.session) setMessage("註冊成功！請到信箱點確認信，再回來登入。");
    }
    setBusy(false);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
      <h1 className="masthead-day">Good day</h1>
      <p className="masthead-date">個人助理</p>
      <p className="mt-6 leading-[1.9]">先全局思考，再看待辦。</p>

      <form onSubmit={submit} className="mt-10 space-y-3">
        <input type="email" required autoComplete="email" placeholder="Email" aria-label="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="field" />
        <input
          type="password"
          required
          minLength={8}
          autoComplete={mode === "signin" ? "current-password" : "new-password"}
          placeholder={mode === "signin" ? "密碼" : "設定密碼（至少 8 碼）"}
          aria-label="密碼"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="field"
        />
        <button disabled={busy} className="btn w-full">
          {busy ? "處理中…" : mode === "signin" ? "登入" : "註冊"}
        </button>
      </form>

      {message && <p className="meta mt-4 leading-relaxed">{message}</p>}

      <button onClick={() => setMode(mode === "signin" ? "signup" : "signin")} className="meta mt-6 min-h-11 self-start underline underline-offset-4">
        {mode === "signin" ? "第一次使用？註冊帳號" : "已經有帳號？登入"}
      </button>
    </main>
  );
}
