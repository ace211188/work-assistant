-- 安全修正
-- 1. 單一擁有者檢查要繞過 RLS，否則第二個帳號看不到擁有者那筆資料，檢查會失效
create or replace function public.pa_single_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from public.pa_profile) then
    raise exception '這個助理已經有擁有者了';
  end if;
  return new;
end;
$$;

-- 2. 固定 search_path
create or replace function public.pa_touch_todo()
returns trigger
language plpgsql
set search_path = ''
as $$
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

-- 3. 觸發器函式不需要開放給 API 呼叫
revoke execute on function public.pa_notify_brief() from public, anon, authenticated;
revoke execute on function public.pa_single_owner() from public, anon, authenticated;

-- 4. 第 0 階段留下、沒有用到的秘密讀取函式
drop function if exists public.pa_secret(text);
