-- Unit + dispatch status fields on planner_slots.

alter table public.planner_slots
  add column if not exists unit_number text,
  add column if not exists dispatched boolean not null default false,
  add column if not exists unloaded boolean not null default false,
  add column if not exists completed boolean not null default false;

notify pgrst, 'reload schema';
