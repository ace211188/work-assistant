-- 回饋先分類：一般回覆、幫他完成的請求（附成品）、不需要回的（不顯示）
alter table public.pa_feedback
  add column kind text not null default 'reply' check (kind in ('reply', 'request', 'skip')),
  add column document_title text,  -- 請求的成品標題
  add column document text;        -- 請求的成品全文（Markdown），在 App 裡展開、複製
