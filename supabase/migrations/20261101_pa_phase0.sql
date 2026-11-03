-- 第 0 階段建立的兩張表（當時直接在資料庫建立，這裡補上紀錄，從零重建時要最先執行）
-- 另外需要的擴充：pg_net（資料庫呼叫 Edge Function）、pg_cron（定時同步與清理）
create extension if not exists pg_net;
create extension if not exists pg_cron;

-- 雲端排程與 Edge Function 的執行紀錄（只放數量和摘要，不放行程或待辦內容）
create table public.pa_healthcheck (
  id bigint generated always as identity primary key,
  source text not null,
  note text,
  created_at timestamptz not null default now()
);
alter table public.pa_healthcheck enable row level security;  -- 沒有 policy：前端讀不到，只有管理者身分能寫

-- 推播訂閱（user_id 欄位與 RLS 在 20261102_pa_v1.sql 補上）
create table public.pa_push_subscriptions (
  endpoint text primary key,
  subscription jsonb not null,
  user_agent text,
  created_at timestamptz not null default now()
);
