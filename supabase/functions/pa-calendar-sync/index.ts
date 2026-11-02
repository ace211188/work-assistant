// 個人工作助理｜行事曆同步（第 0 階段：只驗證讀得到，不存行程內容）
//
// 需要的 Supabase secrets（由使用者自行設定，不經過對話）：
//   GOOGLE_ICAL_URLS    Google 行事曆的「iCal 格式私密網址」，多個用逗號分隔
//   APPLE_ID            Apple ID（Email）
//   APPLE_APP_PASSWORD  iCloud 的 App 專用密碼
//
// 回傳與寫入 pa_healthcheck 的只有數量，不含行程標題。

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import ICAL from "npm:ical.js@2";
import { createDAVClient } from "npm:tsdav@2";

const DAYS_AHEAD = 7;

type SourceResult = {
  ok: boolean;
  calendars?: number;
  events?: number;
  error?: string;
};

// 解析 iCalendar 文字，展開重複行程，回傳區間內的行程數
function countEvents(icsText: string, start: Date, end: Date): number {
  const root = new ICAL.Component(ICAL.parse(icsText));
  for (const tz of root.getAllSubcomponents("vtimezone")) {
    ICAL.TimezoneService.register(tz);
  }

  const rangeStart = ICAL.Time.fromJSDate(start, true);
  const rangeEnd = ICAL.Time.fromJSDate(end, true);
  let count = 0;

  for (const vevent of root.getAllSubcomponents("vevent")) {
    // 重複行程的單次修改（RECURRENCE-ID）由主行程展開時處理
    if (vevent.hasProperty("recurrence-id")) continue;
    const event = new ICAL.Event(vevent);

    if (!event.isRecurring()) {
      if (event.endDate.compare(rangeStart) > 0 && event.startDate.compare(rangeEnd) < 0) count++;
      continue;
    }

    const it = event.iterator();
    for (let next = it.next(); next && next.compare(rangeEnd) < 0; next = it.next()) {
      const occ = event.getOccurrenceDetails(next);
      if (occ.endDate.compare(rangeStart) > 0) count++;
    }
  }
  return count;
}

async function syncGoogle(start: Date, end: Date): Promise<SourceResult> {
  const urls = (Deno.env.get("GOOGLE_ICAL_URLS") ?? "").split(",").map((u) => u.trim()).filter(Boolean);
  if (urls.length === 0) return { ok: false, error: "GOOGLE_ICAL_URLS 未設定" };

  let events = 0;
  for (const url of urls) {
    const res = await fetch(url);
    if (!res.ok) return { ok: false, error: `iCal 網址回應 ${res.status}` };
    events += countEvents(await res.text(), start, end);
  }
  return { ok: true, calendars: urls.length, events };
}

async function syncApple(start: Date, end: Date): Promise<SourceResult> {
  const username = Deno.env.get("APPLE_ID");
  const password = Deno.env.get("APPLE_APP_PASSWORD");
  if (!username || !password) return { ok: false, error: "APPLE_ID 或 APPLE_APP_PASSWORD 未設定" };

  const client = await createDAVClient({
    serverUrl: "https://caldav.icloud.com",
    credentials: { username, password },
    authMethod: "Basic",
    defaultAccountType: "caldav",
  });

  const calendars = (await client.fetchCalendars()).filter((c) =>
    !c.components || c.components.includes("VEVENT")
  );

  let events = 0;
  for (const calendar of calendars) {
    const objects = await client.fetchCalendarObjects({
      calendar,
      timeRange: { start: start.toISOString(), end: end.toISOString() },
    });
    for (const obj of objects) {
      if (obj.data) events += countEvents(obj.data, start, end);
    }
  }
  return { ok: true, calendars: calendars.length, events };
}

async function safely(fn: () => Promise<SourceResult>): Promise<SourceResult> {
  try {
    return await fn();
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

Deno.serve(async () => {
  const start = new Date();
  const end = new Date(start.getTime() + DAYS_AHEAD * 24 * 60 * 60 * 1000);

  const [google, apple] = await Promise.all([
    safely(() => syncGoogle(start, end)),
    safely(() => syncApple(start, end)),
  ]);
  const result = { days: DAYS_AHEAD, google, apple };

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  await supabase.from("pa_healthcheck").insert({
    source: "calendar-sync",
    note: JSON.stringify(result),
  });

  return new Response(JSON.stringify(result), {
    headers: { "Content-Type": "application/json" },
  });
});
