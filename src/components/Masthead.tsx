// 刊頭：斜體英文標題＋大寫小字副標，右側放切換或動作
export default function Masthead({
  title,
  subtitle,
  aside,
}: {
  title: string;
  subtitle?: string;
  aside?: React.ReactNode;
}) {
  return (
    <header className="flex items-end justify-between gap-4 pt-6">
      <div className="min-w-0">
        <h1 className="masthead-day">{title}</h1>
        {subtitle && <p className="masthead-date">{subtitle}</p>}
      </div>
      {aside}
    </header>
  );
}

const WEEKDAY_EN = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTH_EN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

// YYYY-MM-DD（台北日期）→ 英文星期與「NOVEMBER 3」
export function englishDate(date: string) {
  const d = new Date(`${date}T12:00:00+08:00`);
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Taipei", weekday: "long", month: "long", day: "numeric" }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return {
    weekday: get("weekday") || WEEKDAY_EN[d.getDay()],
    monthDay: `${get("month") || MONTH_EN[d.getMonth()]} ${get("day")}`,
  };
}
