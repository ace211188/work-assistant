// 個人助理 — Service Worker
// 路徑一律用相對於 service worker 的位置，GitHub Pages 的子路徑也能用
const HOME = new URL("./", self.location).href;

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

// 收到推播 → 顯示通知
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {};
  }
  event.waitUntil(
    self.registration.showNotification(data.title || "個人助理", {
      body: data.body || "",
      icon: new URL("icon-192.png", HOME).href,
      badge: new URL("icon-192.png", HOME).href,
      data: { url: data.url || HOME },
    })
  );
});

// 點通知 → 打開 App
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || HOME;
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((list) => {
      // App 已經開著：切到通知指定的畫面（例如 #assistant）再帶到前面
      for (const c of list) {
        if (c.url.startsWith(HOME) && "focus" in c) return (url !== HOME && "navigate" in c ? c.navigate(url) : Promise.resolve(c)).then((w) => (w || c).focus());
      }
      return self.clients.openWindow(url);
    })
  );
});
