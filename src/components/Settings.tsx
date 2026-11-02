"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { dateLabel, hhmm, taipeiDate, WEEKDAYS } from "@/lib/time";
import { currentSubscription, enablePush, pushSupported, sendTestPush } from "@/lib/push";
import type { Exception, Recurrence, WorkHour } from "@/lib/types";

const BYDAY = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];

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

const card = "rounded-2xl border border-line bg-card p-4";
const input = "rounded-lg border border-line bg-background px-2 py-1.5";

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
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">設定</h1>
      <PushSection />
      <WorkHours hours={hours} onChange={load} onRemove={(id) => remove("pa_work_hours", id)} />
      <Exceptions list={exceptions} onChange={load} onRemove={(id) => remove("pa_exceptions", id)} />
      <Recurrences list={recurrences} onChange={load} onRemove={(id) => remove("pa_recurrences", id)} />

      <section className={card}>
        <h2 className="font-bold">我的方向</h2>
        <p className="mt-1 text-xs text-muted">年度目標、序曲的願景、最近在意的問題。助理寫早上的思考內容時會參考。之後會由助理訪談你來補完。</p>
        <textarea
          value={direction}
          onChange={(e) => {
            setDirection(e.target.value);
            setDirectionSaved(false);
          }}
          rows={6}
          className="mt-2 w-full rounded-xl border border-line bg-background px-3 py-2 outline-none focus:border-accent"
        />
        <button
          onClick={async () => {
            if (!direction.trim()) return;
            await supabase.from("pa_direction").insert({ content: direction.trim() });
            setDirectionSaved(true);
          }}
          className="mt-2 rounded-lg bg-accent px-4 py-1.5 text-sm text-white"
        >
          儲存
        </button>
        {directionSaved && <span className="ml-2 text-sm text-ok">已儲存 ✓</span>}
      </section>

      <button onClick={() => supabase.auth.signOut()} className="text-sm text-muted underline">
        登出
      </button>
    </div>
  );
}

function PushSection() {
  const [status, setStatus] = useState<string>("");
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
        setStatus("通知已開啟 ✓");
      } else if (result === "denied") setStatus("你沒有允許通知，可以到 iPhone 設定 → 通知 → 個人助理 打開。");
      else setStatus("請從主畫面的圖示打開 App，才能開啟通知。");
    } catch (e) {
      setStatus(`失敗：${e instanceof Error ? e.message : e}`);
    }
  }

  return (
    <section className={card}>
      <h2 className="font-bold">通知</h2>
      <p className="mt-1 text-xs text-muted">早上 7 點和晚上 10 點，內容準備好時通知你。</p>
      <div className="mt-2 flex gap-2">
        <button onClick={enable} disabled={!pushSupported()} className="rounded-lg bg-accent px-4 py-1.5 text-sm text-white disabled:opacity-40">
          {enabled ? "重新綁定這台裝置" : "開啟通知"}
        </button>
        {enabled && (
          <button
            onClick={() => sendTestPush().then(() => setStatus("已送出測試通知 ✓")).catch((e) => setStatus(`失敗：${e.message}`))}
            className="rounded-lg border border-line px-3 py-1.5 text-sm"
          >
            傳測試通知
          </button>
        )}
      </div>
      {status && <p className="mt-2 text-sm text-muted">{status}</p>}
    </section>
  );
}

function WorkHours({ hours, onChange, onRemove }: { hours: WorkHour[]; onChange: () => void; onRemove: (id: number) => void }) {
  const [form, setForm] = useState({ weekday: 1, start: "13:00", end: "21:00" });

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (form.end <= form.start) return;
    await supabase.from("pa_work_hours").insert({ weekday: form.weekday, start_time: form.start, end_time: form.end });
    onChange();
  }

  return (
    <section className={card}>
      <h2 className="font-bold">每週工作時段</h2>
      <p className="mt-1 text-xs text-muted">這些時段的空檔算「可工作」，其他時間都算休息。同一天可以有好幾段。</p>
      <div className="mt-2 space-y-1 text-sm">
        {[1, 2, 3, 4, 5, 6, 0].map((d) => {
          const list = hours.filter((h) => h.weekday === d);
          return (
            <div key={d} className="flex flex-wrap items-center gap-1.5">
              <span className="w-10 text-muted">週{WEEKDAYS[d]}</span>
              {list.length === 0 && <span className="text-xs text-muted">休息</span>}
              {list.map((h) => (
                <span key={h.id} className="rounded-full bg-ok/15 px-2 py-0.5 text-ok">
                  {hhmm(h.start_time)}–{hhmm(h.end_time)}
                  <button onClick={() => onRemove(h.id)} className="ml-1 text-muted" aria-label="刪除">✕</button>
                </span>
              ))}
            </div>
          );
        })}
      </div>
      <form onSubmit={add} className="mt-3 flex flex-wrap items-center gap-2 text-sm">
        <select value={form.weekday} onChange={(e) => setForm({ ...form, weekday: Number(e.target.value) })} className={input}>
          {[1, 2, 3, 4, 5, 6, 0].map((d) => (
            <option key={d} value={d}>週{WEEKDAYS[d]}</option>
          ))}
        </select>
        <input type="time" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} className={input} />
        <span>–</span>
        <input type="time" value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} className={input} />
        <button className="rounded-lg bg-accent px-3 py-1.5 text-white">加入</button>
      </form>
    </section>
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
    <section className={card}>
      <h2 className="font-bold">例外（休假、加班、私人行程）</h2>
      <ul className="mt-2 space-y-1 text-sm">
        {list.map((x) => (
          <li key={x.id} className="flex items-center gap-2">
            <span className={x.kind === "rest" ? "text-muted" : "text-ok"}>{x.kind === "rest" ? "休息" : "工作"}</span>
            <span>{dateLabel(x.date)}</span>
            <span className="text-muted">{x.start_time ? `${hhmm(x.start_time)}–${hhmm(x.end_time)}` : "整天"}</span>
            <span className="min-w-0 flex-1 truncate">{x.note}</span>
            <button onClick={() => onRemove(x.id)} className="text-muted" aria-label="刪除">✕</button>
          </li>
        ))}
        {list.length === 0 && <li className="text-xs text-muted">目前沒有例外。</li>}
      </ul>
      <form onSubmit={add} className="mt-3 flex flex-wrap items-center gap-2 text-sm">
        <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className={input} />
        <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as "rest" | "work" })} className={input}>
          <option value="rest">休息</option>
          <option value="work">工作</option>
        </select>
        <input type="time" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} className={input} />
        <span>–</span>
        <input type="time" value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} className={input} />
        <input placeholder="備註" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} className={`${input} min-w-0 flex-1`} />
        <button className="rounded-lg bg-accent px-3 py-1.5 text-white">加入</button>
      </form>
      <p className="mt-1 text-xs text-muted">時間留空代表整天。</p>
    </section>
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
    <section className={card}>
      <h2 className="font-bold">重複待辦</h2>
      <p className="mt-1 text-xs text-muted">時間到了，早上排程會自動把它放進當天的待辦。</p>
      <ul className="mt-2 space-y-1 text-sm">
        {list.map((r) => (
          <li key={r.id} className="flex items-center gap-2">
            <span className="text-muted">{describeRule(r.rule)}</span>
            <span className="min-w-0 flex-1 truncate">{r.title}</span>
            <button onClick={() => onRemove(r.id)} className="text-muted" aria-label="刪除">✕</button>
          </li>
        ))}
        {list.length === 0 && <li className="text-xs text-muted">例如：每月 5 號繳房租、每週一確認排課。</li>}
      </ul>
      <form onSubmit={add} className="mt-3 space-y-2 text-sm">
        <input placeholder="要做什麼" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={`${input} w-full`} />
        <div className="flex flex-wrap items-center gap-2">
          <select value={form.freq} onChange={(e) => setForm({ ...form, freq: e.target.value })} className={input}>
            <option value="DAILY">每天</option>
            <option value="WEEKLY">每週</option>
            <option value="MONTHLY">每月</option>
          </select>
          {form.freq === "WEEKLY" &&
            [1, 2, 3, 4, 5, 6, 0].map((d) => (
              <button
                type="button"
                key={d}
                onClick={() =>
                  setForm({ ...form, days: form.days.includes(d) ? form.days.filter((x) => x !== d) : [...form.days, d] })
                }
                className={`h-8 w-8 rounded-full ${form.days.includes(d) ? "bg-accent text-white" : "border border-line"}`}
              >
                {WEEKDAYS[d]}
              </button>
            ))}
          {form.freq === "MONTHLY" && (
            <>
              <input type="number" min={1} max={31} value={form.monthday} onChange={(e) => setForm({ ...form, monthday: Number(e.target.value) })} className={`${input} w-16`} />
              <span>號</span>
            </>
          )}
          <button className="ml-auto rounded-lg bg-accent px-3 py-1.5 text-white">加入</button>
        </div>
      </form>
    </section>
  );
}
