-- Ensure fsc exists on schedule_loads (some envs ran detail migration without fsc).

alter table public.schedule_loads
  add column if not exists fsc text;

notify pgrst, 'reload schema';
