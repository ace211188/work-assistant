-- 早晚內容寫入時，由資料庫呼叫 pa-push 通知擁有者
-- anon key 是公開金鑰；pa-push 只會對「剛寫入、還沒通知過」的內容發一次通知
create or replace function public.pa_notify_brief()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.notified_at is null then
    perform net.http_post(
      url := 'https://gffemhrthwdnajdpkwsq.supabase.co/functions/v1/pa-push',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdmZmVtaHJ0aHdkbmFqZHBrd3NxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxMjA0MDIsImV4cCI6MjA5OTY5NjQwMn0.IIUasEgLUiLVJ6ivyjsCLqmRS3AxmVVBtMhbbkPBsAs'
      ),
      body := jsonb_build_object('action', 'brief', 'brief_id', new.id)
    );
  end if;
  return new;
end;
$$;

create trigger pa_briefs_notify after insert on public.pa_briefs
  for each row execute function public.pa_notify_brief();
