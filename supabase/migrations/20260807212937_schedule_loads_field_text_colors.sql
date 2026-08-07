-- Per-field text colors for schedule_loads (shown on the schedule grid).
alter table public.schedule_loads
  add column if not exists field_text_colors jsonb not null default '{}'::jsonb;
