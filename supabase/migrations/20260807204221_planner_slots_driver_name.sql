-- Driver name on planner slots (shown next to unit number).
alter table public.planner_slots
  add column if not exists driver_name text;
