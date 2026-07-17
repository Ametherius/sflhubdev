-- Planner slot rejected status (orange styling in UI).
alter table public.planner_slots
  add column if not exists rejected boolean not null default false;

notify pgrst, 'reload schema';
