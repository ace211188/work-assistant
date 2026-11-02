// 個人工作助理｜推播
//
// 需要的 Supabase secrets（由使用者自行設定，不經過對話）：
//   PA_VAPID_PUBLIC   VAPID 公鑰
//   PA_VAPID_PRIVATE  VAPID 私鑰
//
// 動作（POST JSON）：
//   { action: "config" }                       → 回傳 VAPID 公鑰
//   { action: "subscribe", subscription }      → 保存這台裝置的訂閱
//   { action: "test", endpoint }               → 只發一則測試通知給這台裝置
// 第 0 階段沒有登入，所以只開放「通知自己這台裝置」，不開放群發。

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

  const { action, subscription, endpoint } = await req.json().catch(() => ({}));

  if (action === "config") return json({ vapidPublic });

  if (action === "subscribe") {
    if (!subscription?.endpoint) return json({ error: "缺少 subscription" }, 400);
    const { error } = await supabase.from("pa_push_subscriptions").upsert({
      endpoint: subscription.endpoint,
      subscription,
      user_agent: req.headers.get("user-agent"),
    });
    return error ? json({ error: error.message }, 500) : json({ ok: true });
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
