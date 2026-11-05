-- 讓助理變成員工：交辦清單（含來回對話）、固定職掌、工作守則、週報

-- 交辦：你交代的事（App 交辦、收件匣「幫我…」、回饋裡的請求、職掌自動產生的工作）
create table public.pa_assignments (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  title text not null,
  detail text,
  source text not null default 'app' check (source in ('app', 'inbox', 'feedback', 'duty')),
  duty_id bigint,
  status text not null default 'queued' check (status in ('queued', 'working', 'needs_input', 'done', 'cancelled')),
  result_title text,
  result text,                 -- 成品全文（Markdown）
  notified_status text,        -- 最後一次推播時的狀態，避免重複通知
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  done_at timestamptz
);
create index pa_assignments_user_status on public.pa_assignments (user_id, status, updated_at desc);

-- 交辦底下的來回對話
create table public.pa_assignment_messages (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  assignment_id bigint not null references public.pa_assignments on delete cascade,
  author text not null check (author in ('me', 'assistant')),
  body text not null,
  created_at timestamptz not null default now()
);
create index pa_assignment_messages_thread on public.pa_assignment_messages (assignment_id, created_at);

-- 固定職掌：不用交代就會做的事
create table public.pa_duties (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  title text not null,
  instructions text not null,
  freq text not null check (freq in ('daily', 'weekly', 'monthly')),
  weekday int check (weekday between 0 and 6),     -- weekly 用，0 = 週日
  monthday int check (monthday between 1 and 31),  -- monthly 用
  after_time time not null default '08:00',
  active boolean not null default true,
  last_run_on date,
  created_at timestamptz not null default now()
);
alter table public.pa_assignments
  add constraint pa_assignments_duty_fk foreign key (duty_id) references public.pa_duties on delete set null;

-- 工作守則：你給助理的長期指示（週報的意見也會寫進來）
create table public.pa_staff_rules (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  content text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

do $$
declare t text;
begin
  foreach t in array array['pa_assignments', 'pa_assignment_messages', 'pa_duties', 'pa_staff_rules'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy %I on public.%I for all to authenticated
         using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))',
      t || '_owner', t);
  end loop;
end;
$$;

-- 收件匣裡的「幫我…」會變成交辦；回饋裡的請求也連到交辦
alter table public.pa_inbox add column assignment_id bigint references public.pa_assignments on delete set null;
alter table public.pa_feedback add column assignment_id bigint references public.pa_assignments on delete set null;

-- 週報沿用 pa_briefs（寫入時就會觸發推播）
alter table public.pa_briefs drop constraint pa_briefs_kind_check;
alter table public.pa_briefs add constraint pa_briefs_kind_check check (kind in ('morning', 'midday', 'evening', 'weekly'));

-- 更新時間、完成時間
create or replace function public.pa_touch_assignment()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  if new.status = 'done' and old.status is distinct from 'done' then
    new.done_at := now();
  elsif new.status <> 'done' then
    new.done_at := null;
  end if;
  return new;
end;
$$;
create trigger pa_assignments_touch before update on public.pa_assignments
  for each row execute function public.pa_touch_assignment();

-- 交辦完成、或需要你回覆時推播（pa-push 會再檢查同一個狀態只通知一次）
create or replace function public.pa_notify_assignment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status in ('done', 'needs_input') and new.notified_status is distinct from new.status then
    perform net.http_post(
      url := 'https://gffemhrthwdnajdpkwsq.supabase.co/functions/v1/pa-push',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdmZmVtaHJ0aHdkbmFqZHBrd3NxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxMjA0MDIsImV4cCI6MjA5OTY5NjQwMn0.IIUasEgLUiLVJ6ivyjsCLqmRS3AxmVVBtMhbbkPBsAs'
      ),
      body := jsonb_build_object('action', 'assignment', 'assignment_id', new.id)
    );
  end if;
  return new;
end;
$$;
create trigger pa_assignments_notify after insert or update of status on public.pa_assignments
  for each row execute function public.pa_notify_assignment();
revoke execute on function public.pa_notify_assignment() from public, anon, authenticated;
revoke execute on function public.pa_touch_assignment() from public, anon, authenticated;

-- 今天該做的職掌（台北時間）
create view public.pa_duties_due with (security_invoker = true) as
  select d.*
  from public.pa_duties d, lateral (select now() at time zone 'Asia/Taipei' as n) t
  where d.active
    and d.last_run_on is distinct from t.n::date
    and t.n::time >= d.after_time
    and (d.freq = 'daily'
      or (d.freq = 'weekly' and extract(dow from t.n) = d.weekday)
      or (d.freq = 'monthly' and extract(day from t.n) = d.monthday));

-- 回饋的待處理清單：已經變成交辦的收件匣想法不再回饋
create or replace view public.pa_feedback_pending with (security_invoker = true) as
  select 'idea'::text as source_type, i.id as source_id, i.user_id, i.text as source_text, i.created_at
  from public.pa_inbox i
  where i.processed_at is not null and i.todo_id is null and i.assignment_id is null
    and i.created_at > now() - interval '14 days'
    and not exists (select 1 from public.pa_feedback f where f.source_type = 'idea' and f.source_id = i.id)
  union all
  select 'thought_comment', t.id, t.user_id, t.comment, t.created_at
  from public.pa_thoughts t
  where coalesce(t.comment, '') <> '' and t.created_at > now() - interval '14 days'
    and not exists (select 1 from public.pa_feedback f where f.source_type = 'thought_comment' and f.source_id = t.id and f.source_text = t.comment)
  union all
  select 'reflection', b.id, b.user_id, b.content->>'user_note', b.created_at
  from public.pa_briefs b
  where b.kind = 'evening' and coalesce(b.content->>'user_note', '') <> '' and b.created_at > now() - interval '14 days'
    and not exists (select 1 from public.pa_feedback f where f.source_type = 'reflection' and f.source_id = b.id and f.source_text = b.content->>'user_note')
  union all
  select 'discussion', d.id, d.user_id, d.summary, d.created_at
  from public.pa_discussions d
  where coalesce(d.summary, '') <> '' and d.created_at > now() - interval '14 days'
    and not exists (select 1 from public.pa_feedback f where f.source_type = 'discussion' and f.source_id = d.id);
