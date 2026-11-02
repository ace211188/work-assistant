-- 個人工作助理｜第一版資料表
-- 原則：所有 pa_ 表格都有 user_id，前端只能讀寫自己的資料（RLS）；
--       雲端排程透過 Supabase 連接器（資料庫管理者身分）讀寫，用 pa_profile 找到使用者。

-- 使用者（只允許第一個註冊的帳號成為擁有者）
create table public.pa_profile (
  user_id uuid primary key default auth.uid() references auth.users on delete cascade,
  display_name text not null default '宇群',
  created_at timestamptz not null default now()
);

create or replace function public.pa_single_owner()
returns trigger language plpgsql as $$
begin
  if exists (select 1 from public.pa_profile) then
    raise exception '這個助理已經有擁有者了';
  end if;
  return new;
end;
$$;
create trigger pa_profile_single_owner before insert on public.pa_profile
  for each row execute function public.pa_single_owner();

-- 快速輸入的原文
create table public.pa_inbox (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  text text not null,
  created_at timestamptz not null default now(),
  processed_at timestamptz,
  todo_id bigint
);

-- 重複待辦規則（rule 用 RRULE，例如 FREQ=MONTHLY;BYMONTHDAY=5）
create table public.pa_recurrences (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  title text not null,
  rule text not null,
  category text,
  active boolean not null default true,
  last_generated_on date,
  created_at timestamptz not null default now()
);

-- 待辦
create table public.pa_todos (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  title text not null,
  notes text,
  status text not null default 'open' check (status in ('open', 'done', 'dropped')),
  category text,
  urgency_ai text check (urgency_ai in ('high', 'medium', 'low')),
  urgency_override text check (urgency_override in ('high', 'medium', 'low')),
  urgency_reason text,
  due_date date,
  planned_date date,
  planned_start time,
  planned_end time,
  defer_count int not null default 0,
  recurrence_id bigint references public.pa_recurrences on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);
alter table public.pa_inbox
  add constraint pa_inbox_todo_fk foreign key (todo_id) references public.pa_todos on delete set null;

create or replace function public.pa_touch_todo()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  if new.status = 'done' and old.status is distinct from 'done' then
    new.completed_at := now();
  elsif new.status <> 'done' then
    new.completed_at := null;
  end if;
  return new;
end;
$$;
create trigger pa_todos_touch before update on public.pa_todos
  for each row execute function public.pa_touch_todo();

-- 每週工作時段（同一天可以有多段）
create table public.pa_work_hours (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  weekday smallint not null check (weekday between 0 and 6), -- 0 = 週日
  start_time time not null,
  end_time time not null check (end_time > start_time)
);

-- 例外：休假、加班、私人行程
create table public.pa_exceptions (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  date date not null,
  start_time time,
  end_time time,
  kind text not null check (kind in ('rest', 'work')),
  note text,
  created_at timestamptz not null default now()
);

-- 行事曆快取（由雲端排程寫入）
create table public.pa_calendar_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users on delete cascade,
  source text not null default 'google',
  external_id text not null,
  calendar_name text,
  title text,
  start_at timestamptz not null,
  end_at timestamptz not null,
  all_day boolean not null default false,
  involves_me boolean not null default false,     -- AI 判斷（標題或內容有宇群、或被邀請）
  involves_me_override boolean,                   -- 使用者修正
  synced_at timestamptz not null default now(),
  unique (user_id, source, external_id, start_at)
);

-- 我的方向（保留每個版本）
create table public.pa_direction (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

-- 思考內容與回饋
create table public.pa_thoughts (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users on delete cascade,
  date date not null,
  format text not null check (format in ('question', 'article', 'direction', 'concept')),
  topic text,
  title text not null,
  body text not null,
  why_relevant text,
  question text,
  source_url text,
  feedback text check (feedback in ('useful', 'not_useful')),
  comment text,
  created_at timestamptz not null default now()
);

-- 從 Claude 討論存回的心得
create table public.pa_discussions (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  thought_id bigint references public.pa_thoughts on delete set null,
  summary text not null,
  created_at timestamptz not null default now()
);

-- 早晚內容（content 的格式見 routines/README.md）
create table public.pa_briefs (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users on delete cascade,
  date date not null,
  kind text not null check (kind in ('morning', 'evening')),
  content jsonb not null,
  status text not null default 'draft' check (status in ('draft', 'confirmed')),
  notified_at timestamptz,
  created_at timestamptz not null default now(),
  confirmed_at timestamptz,
  unique (user_id, date, kind)
);

-- 推播訂閱改成屬於使用者
alter table public.pa_push_subscriptions
  add column user_id uuid references auth.users on delete cascade;

-- RLS：每張表只允許擁有者讀寫自己的資料
do $$
declare t text;
begin
  foreach t in array array[
    'pa_profile', 'pa_inbox', 'pa_recurrences', 'pa_todos', 'pa_work_hours',
    'pa_exceptions', 'pa_calendar_events', 'pa_direction', 'pa_thoughts',
    'pa_discussions', 'pa_briefs', 'pa_push_subscriptions'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy %I on public.%I for all to authenticated
         using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))',
      t || '_owner', t);
  end loop;
end;
$$;

create index pa_todos_user_status on public.pa_todos (user_id, status);
create index pa_calendar_events_user_start on public.pa_calendar_events (user_id, start_at);
create index pa_thoughts_user_date on public.pa_thoughts (user_id, date desc);
