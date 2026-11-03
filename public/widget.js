// 個人助理｜iPhone 主畫面小工具（Scriptable）
//
// 用法：在 Scriptable 新增一個腳本，貼上這整段程式碼，在 App 裡執行一次並貼上金鑰
// （金鑰在個人助理 App 的「設定 → Widget」產生），再到主畫面加入 Scriptable 小工具、選這個腳本。
// 金鑰只存在這支 iPhone 的鑰匙圈，不會寫進程式碼。

const API = "https://gffemhrthwdnajdpkwsq.supabase.co/functions/v1/pa-widget";
// 公開的 anon key（App 本身也用這把）；真正的權限由下面的小工具金鑰決定
const ANON =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdmZmVtaHJ0aHdkbmFqZHBrd3NxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxMjA0MDIsImV4cCI6MjA5OTY5NjQwMn0.IIUasEgLUiLVJ6ivyjsCLqmRS3AxmVVBtMhbbkPBsAs";
const APP_URL = "https://ace211188.github.io/work-assistant/#morning";
const KEYCHAIN = "pa-widget-key";

async function askForKey() {
  const a = new Alert();
  a.title = "貼上小工具金鑰";
  a.message = "在個人助理 App 的「設定 → Widget」產生後複製過來。";
  a.addTextField("金鑰");
  a.addAction("儲存");
  a.addCancelAction("取消");
  if ((await a.present()) === -1) return null;
  const key = a.textFieldValue(0).trim();
  if (key) Keychain.set(KEYCHAIN, key);
  return key || null;
}

async function load(key) {
  const req = new Request(API);
  req.headers = { Authorization: `Bearer ${ANON}`, "x-widget-key": key };
  const data = await req.loadJSON();
  if (data.error) throw new Error(data.error);
  return data;
}

function text(stack, value, font, opacity = 1, lines = 1) {
  const t = stack.addText(value);
  t.font = font;
  t.textColor = new Color("#ffffff", opacity);
  t.lineLimit = lines;
  return t;
}

function build(data, size) {
  const w = new ListWidget();
  w.backgroundColor = new Color(data?.color ?? "#566655");
  w.setPadding(14, 16, 14, 16);
  w.url = APP_URL;
  w.refreshAfterDate = new Date(Date.now() + 15 * 60 * 1000);

  if (!data || data.error) {
    text(w, "個人助理", Font.semiboldSystemFont(14));
    w.addSpacer(6);
    text(w, data?.error ?? "在 Scriptable 裡執行一次，貼上金鑰", Font.systemFont(12), 0.85, 4);
    return w;
  }

  text(w, data.weekday, new Font("Georgia-Italic", size === "small" ? 20 : 22));
  w.addSpacer(size === "small" ? 6 : 8);

  if (data.next) {
    text(w, data.next.time ? `NEXT · ${data.next.time}` : "NEXT", Font.mediumSystemFont(10), 0.75);
    w.addSpacer(2);
    text(w, data.next.title, Font.semiboldSystemFont(size === "small" ? 14 : 15), 1, size === "small" ? 3 : 2);
  } else {
    text(w, data.remaining === 0 && data.done > 0 ? "今天排的事都完成了" : "今天沒有排定的事", Font.systemFont(13), 0.9, 2);
  }

  if (size !== "small" && data.event) {
    w.addSpacer(6);
    const row = w.addStack();
    row.spacing = 8;
    text(row, data.event.time, Font.mediumSystemFont(12), 0.85);
    text(row, data.event.title ?? "行程", Font.systemFont(12), 0.85);
  }

  w.addSpacer();
  text(w, `還有 ${data.remaining} 件 · 已完成 ${data.done} 件`, Font.systemFont(11), 0.75);
  return w;
}

let key = Keychain.contains(KEYCHAIN) ? Keychain.get(KEYCHAIN) : null;
if (!key && config.runsInApp) key = await askForKey();

let data = null;
if (key) {
  try {
    data = await load(key);
  } catch (e) {
    data = { error: String(e.message ?? e) };
    // 在 App 裡執行時金鑰無效，就讓他重新貼一次
    if (config.runsInApp && /金鑰/.test(data.error) && (await askForKey())) data = await load(Keychain.get(KEYCHAIN));
  }
}

const size = config.widgetFamily ?? "medium";
const widget = build(data, size);
if (config.runsInWidget) Script.setWidget(widget);
else await widget.presentMedium();
Script.complete();
