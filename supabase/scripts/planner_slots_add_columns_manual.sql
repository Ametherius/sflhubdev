-- Quick fix: add planner_slots columns the app expects (run in Supabase SQL editor).
-- Then: notify pgrst, 'reload schema';

alter table public.planner_slots
  add column if not exists broker_id uuid references public.brokers (id) on delete cascade,
  add column if not exists week_id uuid references public.schedule_weeks (id) on delete cascade,
  add column if not exists plan_date date,
  add column if not exists sort_order integer not null default 1,
  add column if not exists origin text,
  add column if not exists end_user text;

notify pgrst, 'reload schema';
