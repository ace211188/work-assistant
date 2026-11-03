// 個人工作助理｜推播
//
// 需要的 Supabase secrets（由使用者自行設定，不經過對話）：
//   PA_VAPID_PUBLIC   VAPID 公鑰
//   PA_VAPID_PRIVATE  VAPID 私鑰
//
// 動作（POST JSON）：
//   { action: "config" }                       → 回傳 VAPID 公鑰
//   { action: "subscribe", subscription }      → 保存這台裝置的訂閱（需登入，記在該使用者名下）
//   { action: "test", endpoint }               → 只發一則測試通知給這台裝置
//   { action: "brief", brief_id }              → 早、午、晚內容寫入時由資料庫觸發，通知擁有者的所有裝置（中午只在有 push 時通知）
// 群發只限「剛寫入、還沒通知過」的早晚內容，每則最多通知一次，所以不需要另外的密鑰。

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  const vapidPublic = Deno.env.get("PA_VAPID_PUBLIC");
  const vapidPrivate = Deno.env.get("PA_VAPID_PRIVATE");
  if (!vapidPublic || !vapidPrivate) {
    return json({ error: "PA_VAPID_PUBLIC 或 PA_VAPID_PRIVATE 未設定" }, 500);
  }
  webpush.setVapidDetails("mailto:overtureacademyofmusic@gmail.com", vapidPublic, vapidPrivate);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { action, subscription, endpoint, brief_id } = await req.json().catch(() => ({}));

  if (action === "config") return json({ vapidPublic });

  if (action === "subscribe") {
    if (!subscription?.endpoint) return json({ error: "缺少 subscription" }, 400);
    const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
    const { data: auth } = await supabase.auth.getUser(token);
    const { error } = await supabase.from("pa_push_subscriptions").upsert({
      endpoint: subscription.endpoint,
      subscription,
      user_id: auth.user?.id ?? null,
      user_agent: req.headers.get("user-agent"),
    });
    return error ? json({ error: error.message }, 500) : json({ ok: true });
  }

  if (action === "brief") {
    const { data: brief } = await supabase
      .from("pa_briefs")
      .select("id, user_id, kind, content, notified_at, created_at")
      .eq("id", brief_id ?? 0)
      .maybeSingle();
    if (!brief) return json({ error: "找不到這則內容" }, 404);
    const fresh = Date.now() - new Date(brief.created_at).getTime() < 30 * 60 * 1000;
    if (brief.notified_at || !fresh) return json({ ok: true, skipped: true });
    // 中午的內容「有事才推播」：排程沒寫 push 就代表下午沒有變動，安靜就好
    if (brief.kind === "midday" && !brief.content?.push) return json({ ok: true, skipped: true, quiet: true });

    // 先標記已通知，避免重複觸發時發兩次
    const { data: claimed } = await supabase
      .from("pa_briefs")
      .update({ notified_at: new Date().toISOString() })
      .eq("id", brief.id)
      .is("notified_at", null)
      .select("id");
    if (!claimed?.length) return json({ ok: true, skipped: true });

    const fallback = brief.kind === "morning"
      ? { title: "早安 🌅", body: "今天的思考題和行程整理好了" }
      : brief.kind === "midday"
      ? { title: "下午重排好了 ☀️", body: "上午記下的事整理好了，看看下午的安排" }
      : { title: "今天辛苦了 🌙", body: "回顧和明天的排程草稿好了，花 5 分鐘看看" };
    const payload = JSON.stringify({ ...fallback, ...(brief.content?.push ?? {}) });

    const { data: subs } = await supabase
      .from("pa_push_subscriptions")
      .select("endpoint, subscription")
      .eq("user_id", brief.user_id);

    let sent = 0;
    const failures: string[] = [];
    for (const s of subs ?? []) {
      try {
        await webpush.sendNotification(s.subscription, payload);
        sent++;
      } catch (e) {
        const status = (e as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await supabase.from("pa_push_subscriptions").delete().eq("endpoint", s.endpoint);
        }
        failures.push(`${status ?? ""} ${e instanceof Error ? e.message : String(e)}`.trim());
      }
    }
    // 每次早晚通知都留一筆紀錄；一台都沒送到時一查就知道原因
    const note = sent > 0
      ? `${brief.kind} sent ${sent}`
      : `${brief.kind} sent 0：${subs?.length ? failures.join("；") : "沒有綁定帳號的裝置"}`;
    await supabase.from("pa_healthcheck").insert({ source: "push-brief", note });
    return json({ ok: true, sent });
  }

  if (action === "test") {
    const { data: row } = await supabase
      .from("pa_push_subscriptions")
      .select("subscription")
      .eq("endpoint", endpoint ?? "")
      .maybeSingle();
    if (!row) return json({ error: "找不到這台裝置的訂閱" }, 404);

    try {
      await webpush.sendNotification(
        row.subscription,
        JSON.stringify({
          title: "個人助理 🌅",
          body: "推播測試成功！之後早上 7 點的思考內容會這樣通知你。",
        }),
      );
      await supabase.from("pa_healthcheck").insert({ source: "push-test", note: "sent" });
      return json({ ok: true });
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) {
        await supabase.from("pa_push_subscriptions").delete().eq("endpoint", endpoint);
      }
      const note = `failed ${status ?? ""} ${e instanceof Error ? e.message : String(e)}`;
      await supabase.from("pa_healthcheck").insert({ source: "push-test", note });
      return json({ error: note }, 502);
    }
  }

  return json({ error: "未知的 action" }, 400);
});
