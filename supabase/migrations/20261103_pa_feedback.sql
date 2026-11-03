-- 助理對你寫下的東西給回饋：隨手記的想法、今日思考的感想、晚上回顧的心得、和 Claude 聊完的結論
-- 由每小時的雲端排程寫入；source_text 存下當時看到的原文，原文改了就會再回饋一次
create table public.pa_feedback (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  source_type text not null check (source_type in ('idea', 'thought_comment', 'reflection', 'discussion')),
  source_id bigint not null,
  source_text text not null,
  body text not null,          -- 回饋本身（延伸想法、串起過去的想法）
  question text,               -- 追問
  action text,                 -- 建議可以做的事；使用者同意才變成待辦
  action_todo_id bigint references public.pa_todos on delete set null,
  dismissed_at timestamptz,    -- 使用者按「收到」
  created_at timestamptz not null default now()
);
create index pa_feedback_user_created on public.pa_feedback (user_id, created_at desc);

alter table public.pa_feedback enable row level security;
create policy pa_feedback_owner on public.pa_feedback for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- 還沒回饋過的東西（最近 14 天）；排程先查這個，沒有就直接結束
create view public.pa_feedback_pending with (security_invoker = true) as
  select 'idea'::text as source_type, i.id as source_id, i.user_id, i.text as source_text, i.created_at
  from public.pa_inbox i
  where i.processed_at is not null and i.todo_id is null and i.created_at > now() - interval '14 days'
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
