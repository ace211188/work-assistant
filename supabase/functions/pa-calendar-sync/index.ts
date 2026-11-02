// 個人工作助理｜Apple 行事曆同步
//
// 由資料庫排程（pg_cron）每 30 分鐘呼叫一次。讀取 iCloud 行事曆未來幾天的行程，
// 寫進 pa_calendar_events（source = 'apple'）。Apple 行事曆是宇群的個人行事曆，所以每筆都算他的行程。
// Google 教室行事曆由早晚雲端排程透過連接器同步（source = 'google'），這裡不碰。
//
// 需要的 Supabase secrets（由使用者自行設定，不經過對話）：
//   APPLE_ID            Apple ID（Email）
//   APPLE_APP_PASSWORD  iCloud 的 App 專用密碼
//
// 回傳與寫入 pa_healthcheck 的只有數量，不含行程內容。

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import ICAL from "npm:ical.js@2";
import { createDAVClient } from "npm:tsdav@2";

const DAYS_AHEAD = 8;
const TZ_OFFSET = "+08:00";

type Occurrence = {
  external_id: string;
  calendar_name: string | null;
  title: string | null;
  start_at: string;
  end_at: string;
  all_day: boolean;
};

// ICAL.Time → ISO 字串；整天的行程以台北時間的午夜表示
function toIso(t: ICAL.Time): string {
  if (t.isDate) {
    const d = `${t.year}-${String(t.month).padStart(2, "0")}-${String(t.day).padStart(2, "0")}`;
    return `${d}T00:00:00${TZ_OFFSET}`;
  }
  return t.toJSDate().toISOString();
}

// 解析一個 iCalendar 物件，展開區間內的每一次行程（含重複行程與單次修改）
function occurrences(icsText: string, calendarName: string | null, start: Date, end: Date): Occurrence[] {
  const root = new ICAL.Component(ICAL.parse(icsText));
  for (const tz of root.getAllSubcomponents("vtimezone")) ICAL.TimezoneService.register(tz);

  const rangeStart = ICAL.Time.fromJSDate(start, true);
  const rangeEnd = ICAL.Time.fromJSDate(end, true);
  const vevents = root.getAllSubcomponents("vevent");
  const masters = vevents.filter((v) => !v.hasProperty("recurrence-id"));
  const exceptions = vevents.filter((v) => v.hasProperty("recurrence-id"));
  const out: Occurrence[] = [];

  for (const master of masters) {
    const uid = String(master.getFirstPropertyValue("uid") ?? "");
    const event = new ICAL.Event(master, {
      exceptions: exceptions.filter((e) => String(e.getFirstPropertyValue("uid")) === uid),
    });
    const push = (s: ICAL.Time, e: ICAL.Time, summary: string | null) => {
      if (e.compare(rangeStart) <= 0 || s.compare(rangeEnd) >= 0) return;
      out.push({
        external_id: uid,
        calendar_name: calendarName,
        title: summary,
        start_at: toIso(s),
        end_at: toIso(e),
        all_day: s.isDate,
      });
    };

    if (!event.isRecurring()) {
      push(event.startDate, event.endDate, event.summary ?? null);
      continue;
    }
    const it = event.iterator();
    for (let next = it.next(); next && next.compare(rangeEnd) < 0; next = it.next()) {
      const occ = event.getOccurrenceDetails(next);
      push(occ.startDate, occ.endDate, occ.item.summary ?? null);
    }
  }
  return out;
}

Deno.serve(async () => {
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const log = async (note: unknown) =>
    void (await supabase.from("pa_healthcheck").insert({ source: "apple-calendar-sync", note: JSON.stringify(note) }));

  // 貼上時常會多帶空白或換行，先清掉
  const username = Deno.env.get("APPLE_ID")?.trim();
  const password = Deno.env.get("APPLE_APP_PASSWORD")?.replace(/\s/g, "");
  if (!username || !password) {
    return Response.json({ ok: false, error: "APPLE_ID 或 APPLE_APP_PASSWORD 未設定" });
  }

  // 先單獨確認登入，讓錯誤訊息比 tsdav 的「cannot find homeUrl」清楚；只回報狀態，不含帳密
  const probe = await fetch("https://caldav.icloud.com/", {
    method: "PROPFIND",
    headers: {
      Authorization: `Basic ${btoa(`${username}:${password}`)}`,
      Depth: "0",
      "Content-Type": "application/xml; charset=utf-8",
    },
    body: `<?xml version="1.0"?><d:propfind xmlns:d="DAV:"><d:prop><d:current-user-principal/></d:prop></d:propfind>`,
  });
  await probe.body?.cancel();
  if (probe.status === 401) {
    const result = {
      ok: false,
      error: "iCloud 登入失敗（401）",
      apple_id_is_email: username.includes("@"),
      password_looks_app_specific: /^[a-z]{4}-?[a-z]{4}-?[a-z]{4}-?[a-z]{4}$/.test(password),
    };
    await log(result);
    return Response.json(result, { status: 500 });
  }

  const { data: owner } = await supabase.from("pa_profile").select("user_id").limit(1).maybeSingle();
  if (!owner) return Response.json({ ok: false, error: "還沒有擁有者帳號" });

  const syncStartedAt = new Date().toISOString();
  const start = new Date(new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Taipei" }) + `T00:00:00${TZ_OFFSET}`);
  const end = new Date(start.getTime() + DAYS_AHEAD * 86400_000);

  try {
    const client = await createDAVClient({
      serverUrl: "https://caldav.icloud.com",
      credentials: { username, password },
      authMethod: "Basic",
      defaultAccountType: "caldav",
    });
    const calendars = (await client.fetchCalendars()).filter((c) => !c.components || c.components.includes("VEVENT"));

    const rows: Occurrence[] = [];
    for (const calendar of calendars) {
      const name = typeof calendar.displayName === "string" ? calendar.displayName : null;
      const objects = await client.fetchCalendarObjects({
        calendar,
        timeRange: { start: start.toISOString(), end: end.toISOString() },
      });
      for (const obj of objects) if (obj.data) rows.push(...occurrences(obj.data, name, start, end));
    }

    if (rows.length > 0) {
      const { error } = await supabase.from("pa_calendar_events").upsert(
        rows.map((r) => ({ ...r, user_id: owner.user_id, source: "apple", involves_me: true, synced_at: syncStartedAt })),
        { onConflict: "user_id,source,external_id,start_at", ignoreDuplicates: false },
      );
      if (error) throw new Error(error.message);
    }

    // 這次沒看到的 Apple 行程（被取消或移走）從快取刪掉；只動 source = 'apple'
    await supabase
      .from("pa_calendar_events")
      .delete()
      .eq("source", "apple")
      .gte("start_at", start.toISOString())
      .lt("start_at", end.toISOString())
      .lt("synced_at", syncStartedAt);

    const result = { ok: true, calendars: calendars.length, events: rows.length, days: DAYS_AHEAD };
    await log(result);
    return Response.json(result);
  } catch (e) {
    const result = { ok: false, error: e instanceof Error ? e.message : String(e) };
    await log(result);
    return Response.json(result, { status: 500 });
  }
});
