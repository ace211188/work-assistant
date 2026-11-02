-- 每 30 分鐘同步一次 Apple 行事曆（pa-calendar-sync 沒設定 secrets 時會直接回報未設定，不做事）
-- anon key 是公開金鑰；這支函式只會重新同步擁有者的 Apple 行事曆，被別人觸發也沒有影響
select cron.schedule(
  'pa-apple-calendar-sync',
  '*/30 * * * *',
  $$
  select net.http_post(
    url := 'https://gffemhrthwdnajdpkwsq.supabase.co/functions/v1/pa-calendar-sync',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdmZmVtaHJ0aHdkbmFqZHBrd3NxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxMjA0MDIsImV4cCI6MjA5OTY5NjQwMn0.IIUasEgLUiLVJ6ivyjsCLqmRS3AxmVVBtMhbbkPBsAs'
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
  $$
);
