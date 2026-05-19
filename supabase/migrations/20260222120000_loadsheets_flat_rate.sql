alter table public.loadsheets
  add column if not exists flat_rate boolean not null default false;
