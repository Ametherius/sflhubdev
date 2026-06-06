-- Vacating archives schedule_loads onto schedule_assignment_id and clears in_use_unit_id.
-- 20260214120000 set in_use_unit_id NOT NULL; archive logic (20260528120000) requires it nullable.

alter table public.schedule_loads
  alter column in_use_unit_id drop not null;

notify pgrst, 'reload schema';
