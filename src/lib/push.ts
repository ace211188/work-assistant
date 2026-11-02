"use client";

import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from "./supabase";

const FN_URL = `${SUPABASE_URL}/functions/v1/pa-push`;

function b64ToBytes(b64: string) {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

async function callFn(body: object) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token ?? SUPABASE_ANON_KEY;
  const res = await fetch(FN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, apikey: SUPABASE_ANON_KEY },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
  return json;
}

export function pushSupported() {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

export async function currentSubscription() {
  if (!pushSupported()) return null;
  const reg = await navigator.serviceWorker.ready;
  return reg.pushManager.getSubscription();
}

// 開啟通知，並把訂閱記在目前登入的帳號名下（舊的訂閱也會重新綁定）
export async function enablePush(): Promise<"ok" | "denied" | "unsupported"> {
  if (!pushSupported()) return "unsupported";
  if ((await Notification.requestPermission()) !== "granted") return "denied";
  const { vapidPublic } = await callFn({ action: "config" });
  const reg = await navigator.serviceWorker.ready;
  const sub =
    (await reg.pushManager.getSubscription()) ||
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(vapidPublic) }));
  await callFn({ action: "subscribe", subscription: sub.toJSON() });
  return "ok";
}

// 開 App 時把已開啟通知的裝置重新綁到目前帳號（例如登入前就開啟過通知的裝置）
export async function rebindPush() {
  if (!pushSupported() || Notification.permission !== "granted") return;
  const sub = await currentSubscription();
  if (sub) await callFn({ action: "subscribe", subscription: sub.toJSON() });
}

export async function sendTestPush() {
  const sub = await currentSubscription();
  if (!sub) throw new Error("這台裝置還沒開啟通知");
  await callFn({ action: "test", endpoint: sub.endpoint });
}
