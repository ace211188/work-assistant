// 一律以台北時間計算「今天」，避免跨日誤判
const TZ = "Asia/Taipei";

export const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];

export function taipeiDate(offsetDays = 0): string {
  const d = new Date(Date.now() + offsetDays * 86400_000);
  return d.toLocaleDateString("sv-SE", { timeZone: TZ }); // YYYY-MM-DD
}

export function taipeiHour(): number {
  return Number(new Date().toLocaleString("en-US", { timeZone: TZ, hour: "numeric", hour12: false })) % 24;
}

export function hhmm(value: string | null | undefined): string {
  if (!value) return "";
  if (/^\d{2}:\d{2}/.test(value)) return value.slice(0, 5); // time 欄位
  return new Date(value).toLocaleTimeString("zh-TW", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false });
}

export function dateLabel(date: string | null | undefined): string {
  if (!date) return "";
  if (date === taipeiDate()) return "今天";
  if (date === taipeiDate(1)) return "明天";
  if (date === taipeiDate(-1)) return "昨天";
  const d = new Date(`${date}T00:00:00+08:00`);
  return `${d.getMonth() + 1}/${d.getDate()}（${WEEKDAYS[d.getDay()]}）`;
}

// 台北某天的起訖（給行事曆查詢用）
export function dayRange(date: string): { from: string; to: string } {
  return { from: `${date}T00:00:00+08:00`, to: `${date}T23:59:59+08:00` };
}
