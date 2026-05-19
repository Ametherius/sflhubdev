-- Per-cell load details for schedule (origin, end user, metrics).
alter table public.schedule_loads
  add column if not exists origin text,
  add column if not exists end_user text,
  add column if not exists mt text,
  add column if not exists rate text,
  add column if not exists load_total text;

notify pgrst, 'reload schema';
