-- 已取消的行程改用標記，不讓雲端排程下 DELETE
-- （Supabase 連接器遇到 DELETE 會要求人工確認，排程沒人能按，會整個卡住）
alter table public.pa_calendar_events add column cancelled_at timestamptz;

-- 真正的刪除由資料庫自己每天做一次（台北時間凌晨 3 點）：
-- 標記取消超過一天的、以及結束超過 14 天的舊行程
select cron.schedule(
  'pa-calendar-purge',
  '0 19 * * *',
  $$
  delete from public.pa_calendar_events
  where cancelled_at < now() - interval '1 day'
     or end_at < now() - interval '14 days';
  $$
);
