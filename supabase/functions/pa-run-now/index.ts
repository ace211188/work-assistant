// 個人工作助理｜立即整理
//
// App 上的「立即整理」按鈕呼叫這支函式，它再用排程的 API 觸發金鑰，叫雲端排程「個人助理｜員工」馬上跑一輪
// （整理收件匣、做交辦、回應想法），不用等每 2 小時的定時。
//
// 需要的 Supabase secrets（由使用者自行設定，不經過對話）：
//   PA_ROUTINE_TOKEN  在 claude.ai/code/routines 為「個人助理｜員工」產生的 API 觸發金鑰（sk-ant-oat01-…）
//
// 安全：只有登入的擁有者能按；5 分鐘內只能按一次（排程每小時最多被觸發 30 次）。

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const ROUTINE_ID = "trig_01BcpsjmCytLzHjtmSPbtKUC";
const COOLDOWN_MIN = 5;
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  const routineToken = Deno.env.get("PA_ROUTINE_TOKEN");
  if (!routineToken) return json({ error: "還沒設定 PA_ROUTINE_TOKEN" }, 500);

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  // 只有擁有者能按
  const jwt = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data: auth } = await supabase.auth.getUser(jwt);
  const { data: owner } = await supabase.from("pa_profile").select("user_id").limit(1).maybeSingle();
  if (!auth.user || !owner || auth.user.id !== owner.user_id) return json({ error: "只有擁有者可以使用" }, 403);

  // 冷卻時間：避免連按觸發好幾輪
  const since = new Date(Date.now() - COOLDOWN_MIN * 60_000).toISOString();
  const { data: recent } = await supabase
    .from("pa_healthcheck")
    .select("created_at")
    .eq("source", "run-now")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (recent) {
    const wait = Math.ceil((new Date(recent.created_at).getTime() + COOLDOWN_MIN * 60_000 - Date.now()) / 60_000);
    return json({ ok: false, cooling: true, wait }, 429);
  }

  const res = await fetch(`https://api.anthropic.com/v1/claude_code/routines/${ROUTINE_ID}/fire`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${routineToken}`,
      "anthropic-version": "2026-10-21",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text: "宇群剛剛在 App 按了「立即整理」，請照指示馬上處理這一輪（收件匣、交辦、回饋）。" }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const note = `failed ${res.status} ${body?.error?.type ?? ""}`;
    await supabase.from("pa_healthcheck").insert({ source: "run-now-error", note });
    return json({ ok: false, error: res.status === 401 ? "排程金鑰無效，請重新產生" : res.status === 429 ? "這個小時觸發太多次了，晚點再試" : "排程沒有啟動成功" }, 502);
  }
  await supabase.from("pa_healthcheck").insert({ source: "run-now", note: body.claude_code_session_id ?? "started" });
  return json({ ok: true });
});
