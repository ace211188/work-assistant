"use client";

import { useCallback, useEffect, useState } from "react";
import { IconX } from "@tabler/icons-react";
import { supabase } from "@/lib/supabase";
import { dateLabel, hhmm, taipeiDate, WEEKDAYS } from "@/lib/time";
import { currentSubscription, enablePush, pushSupported, sendTestPush } from "@/lib/push";
import type { Exception, Recurrence, WorkHour } from "@/lib/types";
import Masthead from "./Masthead";

const BYDAY = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

export function describeRule(rule: string) {
  const parts = Object.fromEntries(rule.split(";").map((p) => p.split("=")));
  if (parts.FREQ === "DAILY") return "每天";
  if (parts.FREQ === "WEEKLY") {
    const days = (parts.BYDAY ?? "").split(",").map((d: string) => WEEKDAYS[BYDAY.indexOf(d)]).join("、");
    return `每週${days}`;
  }
  if (parts.FREQ === "MONTHLY") return `每月 ${parts.BYMONTHDAY} 號`;
  return rule;
}

// 星期多選：用在工作時段與重複待辦
function DayPicker({ value, onChange }: { value: number[]; onChange: (v: number[]) => void }) {
  return (
    <div className="grid grid-cols-7 gap-1">
      {WEEK_ORDER.map((d) => (
        <button
          type="button"
          key={d}
          aria-pressed={value.includes(d)}
          aria-label={`週${WEEKDAYS[d]}`}
          onClick={() => onChange(value.includes(d) ? value.filter((x) => x !== d) : [...value, d])}
          className="btn-quiet h-11 px-0"
        >
          {WEEKDAYS[d]}
        </button>
      ))}
    </div>
  );
}

export default function Settings() {
  const [hours, setHours] = useState<WorkHour[]>([]);
  const [exceptions, setExceptions] = useState<Exception[]>([]);
  const [recurrences, setRecurrences] = useState<Recurrence[]>([]);
  const [direction, setDirection] = useState("");
  const [directionSaved, setDirectionSaved] = useState(false);

  const load = useCallback(async () => {
    const [h, e, r, d] = await Promise.all([
      supabase.from("pa_work_hours").select("*").order("weekday").order("start_time"),
      supabase.from("pa_exceptions").select("*").gte("date", taipeiDate()).order("date"),
      supabase.from("pa_recurrences").select("*").order("created_at"),
      supabase.from("pa_direction").select("content").order("created_at", { ascending: false }).limit(1).maybeSingle(),
    ]);
    setHours((h.data as WorkHour[]) ?? []);
    setExceptions((e.data as Exception[]) ?? []);
    setRecurrences((r.data as Recurrence[]) ?? []);
    setDirection(d.data?.content ?? "");
  }, []);

  useEffect(() => {
    // 載入設定（非同步，結果回來才更新狀態）
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function remove(table: string, id: number) {
    await supabase.from(table).delete().eq("id", id);
    load();
  }

  return (
    <div>
      <Masthead title="Settings" />
      <PushSection />
      <WorkHours hours={hours} onChange={load} onRemove={(id) => remove("pa_work_hours", id)} />
      <Exceptions list={exceptions} onChange={load} onRemove={(id) => remove("pa_exceptions", id)} />
      <Recurrences list={recurrences} onChange={load} onRemove={(id) => remove("pa_recurrences", id)} />

      <h2 className="sec">My direction</h2>
      <div className="card space-y-3">
        <p className="meta leading-relaxed">年度目標、序曲的願景、最近在意的問題。早上的思考內容會參考這裡；之後會由助理訪談你來補完。</p>
        <textarea
          value={direction}
          onChange={(e) => {
            setDirection(e.target.value);
            setDirectionSaved(false);
          }}
          rows={6}
          aria-label="我的方向"
          className="field leading-[1.8]"
        />
        <div className="flex items-center gap-3">
          <button
            onClick={async () => {
              if (!direction.trim()) return;
              await supabase.from("pa_direction").insert({ content: direction.trim() });
              setDirectionSaved(true);
            }}
            className="btn"
          >
            儲存
          </button>
          {directionSaved && <span className="meta">已儲存</span>}
        </div>
      </div>

      <button onClick={() => supabase.auth.signOut()} className="btn-quiet mt-8">
        登出
      </button>
    </div>
  );
}

function PushSection() {
  const [status, setStatus] = useState("");
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    currentSubscription().then((s) => setEnabled(!!s));
  }, []);

  async function enable() {
    setStatus("處理中…");
    try {
      const result = await enablePush();
      if (result === "ok") {
        setEnabled(true);
        setStatus("通知已開啟。");
      } else if (result === "denied") setStatus("你沒有允許通知，可以到 iPhone 設定 → 通知 → 個人助理 打開。");
      else setStatus("請從主畫面的圖示打開 App，才能開啟通知。");
    } catch (e) {
      setStatus(`開啟失敗：${e instanceof Error ? e.message : e}。請稍後再試一次。`);
    }
  }

  return (
    <>
      <h2 className="sec">Notifications</h2>
      <div className="card space-y-3">
        <p className="leading-relaxed">早上 7 點和晚上 10 點，內容準備好時通知你。</p>
        <div className="flex flex-wrap gap-2">
          <button onClick={enable} disabled={!pushSupported()} className="btn">
            {enabled ? "重新綁定這台裝置" : "開啟通知"}
          </button>
          {enabled && (
            <button
              onClick={() => sendTestPush().then(() => setStatus("已送出測試通知。")).catch((e) => setStatus(`測試失敗：${e.message}`))}
              className="btn-quiet"
            >
              傳測試通知
            </button>
          )}
        </div>
        {status && <p className="meta">{status}</p>}
      </div>
    </>
  );
}

// 工作時段：可以一次選好幾天、套用同一段時間
function WorkHours({ hours, onChange, onRemove }: { hours: WorkHour[]; onChange: () => void; onRemove: (id: number) => void }) {
  const [days, setDays] = useState<number[]>([]);
  const [start, setStart] = useState("13:00");
  const [end, setEnd] = useState("21:00");
  const [error, setError] = useState("");

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (days.length === 0) return setError("先選要套用的星期。");
    if (end <= start) return setError("結束時間要晚於開始時間。");
    setError("");
    await supabase.from("pa_work_hours").insert(days.map((d) => ({ weekday: d, start_time: start, end_time: end })));
    setDays([]);
    onChange();
  }

  return (
    <>
      <h2 className="sec">Working hours</h2>
      <div className="card">
        <p className="meta leading-relaxed">這些時段的空檔算「可以工作」，其他時間都算休息。同一天可以有好幾段。</p>
        <ul className="mt-2 divide-y divide-line">
          {WEEK_ORDER.map((d) => {
            const list = hours.filter((h) => h.weekday === d);
            return (
              <li key={d} className="flex min-h-11 flex-wrap items-center gap-x-3 gap-y-1 py-1">
                <span className="w-10 shrink-0">週{WEEKDAYS[d]}</span>
                {list.length === 0 && <span className="meta">Day off</span>}
                {list.map((h) => (
                  <span key={h.id} className="num inline-flex items-center text-[15px]">
                    {hhmm(h.start_time)} – {hhmm(h.end_time)}
                    <button onClick={() => onRemove(h.id)} aria-label={`刪除週${WEEKDAYS[d]} ${hhmm(h.start_time)} 這段`} className="flex h-11 w-11 items-center justify-center">
                      <IconX size={15} stroke={1.6} />
                    </button>
                  </span>
                ))}
              </li>
            );
          })}
        </ul>
        <form onSubmit={add} className="mt-3 space-y-3 border-t border-line pt-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="meta mr-1">快速選</span>
            <button type="button" onClick={() => setDays([1, 2, 3, 4, 5])} className="btn-quiet text-[14px]">平日</button>
            <button type="button" onClick={() => setDays([6, 0])} className="btn-quiet text-[14px]">週末</button>
            <button type="button" onClick={() => setDays([0, 1, 2, 3, 4, 5, 6])} className="btn-quiet text-[14px]">每天</button>
          </div>
          <DayPicker value={days} onChange={setDays} />
          <div className="num flex items-center gap-2">
            <input type="time" value={start} onChange={(e) => setStart(e.target.value)} aria-label="開始時間" className="field w-auto" />
            <span>–</span>
            <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} aria-label="結束時間" className="field w-auto" />
          </div>
          <button className="btn w-full">{days.length > 0 ? `加到 ${days.length} 天` : "加入時段"}</button>
          {error && <p className="meta">{error}</p>}
        </form>
      </div>
    </>
  );
}

function Exceptions({ list, onChange, onRemove }: { list: Exception[]; onChange: () => void; onRemove: (id: number) => void }) {
  const [form, setForm] = useState({ date: taipeiDate(1), kind: "rest" as "rest" | "work", start: "", end: "", note: "" });

  async function add(e: React.FormEvent) {
    e.preventDefault();
    await supabase.from("pa_exceptions").insert({
      date: form.date,
      kind: form.kind,
      start_time: form.start || null,
      end_time: form.end || null,
      note: form.note || null,
    });
    setForm({ ...form, start: "", end: "", note: "" });
    onChange();
  }

  return (
    <>
      <h2 className="sec">Exceptions</h2>
      <div className="card">
        <p className="meta leading-relaxed">休假、加班、私人行程。時間留空代表整天。</p>
        <ul className="mt-2 divide-y divide-line">
          {list.map((x) => (
            <li key={x.id} className="flex min-h-11 items-center gap-3">
              <span>{x.kind === "rest" ? "休息" : "工作"}</span>
              <span>{dateLabel(x.date)}</span>
              <span className="num text-[15px]">{x.start_time ? `${hhmm(x.start_time)} – ${hhmm(x.end_time)}` : "All day"}</span>
              <span className="meta min-w-0 flex-1 truncate">{x.note}</span>
              <button onClick={() => onRemove(x.id)} aria-label="刪除這個例外" className="flex h-11 w-11 items-center justify-center">
                <IconX size={15} stroke={1.6} />
              </button>
            </li>
          ))}
          {list.length === 0 && <li className="meta py-2">目前沒有例外。</li>}
        </ul>
        <form onSubmit={add} className="mt-3 space-y-3 border-t border-line pt-4">
          <div className="flex gap-2">
            <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} aria-label="日期" className="field" />
            <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as "rest" | "work" })} aria-label="休息或工作" className="field w-28">
              <option value="rest">休息</option>
              <option value="work">工作</option>
            </select>
          </div>
          <div className="num flex items-center gap-2">
            <input type="time" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} aria-label="開始時間" className="field w-auto" />
            <span>–</span>
            <input type="time" value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} aria-label="結束時間" className="field w-auto" />
          </div>
          <div className="flex gap-2">
            <input placeholder="備註" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} aria-label="備註" className="field min-w-0 flex-1" />
            <button className="btn shrink-0">加入</button>
          </div>
        </form>
      </div>
    </>
  );
}

function Recurrences({ list, onChange, onRemove }: { list: Recurrence[]; onChange: () => void; onRemove: (id: number) => void }) {
  const [form, setForm] = useState({ title: "", freq: "MONTHLY", days: [1] as number[], monthday: 1 });

  function buildRule() {
    if (form.freq === "DAILY") return "FREQ=DAILY";
    if (form.freq === "WEEKLY") return `FREQ=WEEKLY;BYDAY=${form.days.map((d) => BYDAY[d]).join(",")}`;
    return `FREQ=MONTHLY;BYMONTHDAY=${form.monthday}`;
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || (form.freq === "WEEKLY" && form.days.length === 0)) return;
    await supabase.from("pa_recurrences").insert({ title: form.title.trim(), rule: buildRule() });
    setForm({ ...form, title: "" });
    onChange();
  }

  return (
    <>
      <h2 className="sec">Repeating tasks</h2>
      <div className="card">
        <p className="meta leading-relaxed">時間到了，早上整理時會自動放進當天的待辦。</p>
        <ul className="mt-2 divide-y divide-line">
          {list.map((r) => (
            <li key={r.id} className="flex min-h-11 items-center gap-3">
              <span className="meta shrink-0">{describeRule(r.rule)}</span>
              <span className="min-w-0 flex-1 truncate">{r.title}</span>
              <button onClick={() => onRemove(r.id)} aria-label={`刪除重複待辦「${r.title}」`} className="flex h-11 w-11 items-center justify-center">
                <IconX size={15} stroke={1.6} />
              </button>
            </li>
          ))}
          {list.length === 0 && <li className="meta py-2">例如：每月 5 號繳房租、每週一確認排課。</li>}
        </ul>
        <form onSubmit={add} className="mt-3 space-y-3 border-t border-line pt-4">
          <input placeholder="要做什麼" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} aria-label="要做什麼" className="field" />
          <div className="flex gap-2">
            <select value={form.freq} onChange={(e) => setForm({ ...form, freq: e.target.value })} aria-label="頻率" className="field w-28">
              <option value="DAILY">每天</option>
              <option value="WEEKLY">每週</option>
              <option value="MONTHLY">每月</option>
            </select>
            {form.freq === "MONTHLY" && (
              <label className="num flex items-center gap-2">
                <input type="number" min={1} max={31} value={form.monthday} onChange={(e) => setForm({ ...form, monthday: Number(e.target.value) })} aria-label="每月幾號" className="field w-20" />
                號
              </label>
            )}
          </div>
          {form.freq === "WEEKLY" && <DayPicker value={form.days} onChange={(days) => setForm({ ...form, days })} />}
          <button className="btn w-full">加入重複待辦</button>
        </form>
      </div>
    </>
  );
}
