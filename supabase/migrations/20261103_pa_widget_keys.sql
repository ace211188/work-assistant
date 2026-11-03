-- iPhone 小工具（Scriptable）用的唯讀金鑰
-- 金鑰在使用者的瀏覽器產生、只顯示一次；這裡只存 SHA-256 雜湊，看不到原文
create table public.pa_widget_keys (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  key_hash text not null unique,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

alter table public.pa_widget_keys enable row level security;
create policy pa_widget_keys_owner on public.pa_widget_keys for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
