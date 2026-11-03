-- 中午 12:00 多一次排程：整理上午記下的事、重排下午（kind = 'midday'）
alter table public.pa_briefs drop constraint pa_briefs_kind_check;
alter table public.pa_briefs add constraint pa_briefs_kind_check check (kind in ('morning', 'midday', 'evening'));
