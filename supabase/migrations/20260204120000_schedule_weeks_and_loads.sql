-- Weekly schedule: one row per week + 7 days × 3 load slots per week.
create table if not exists public.schedule_weeks (
  id uuid primary key default gen_random_uuid(),
  week_start_date date not null,
  created_at timestamptz not null default now(),
  constraint schedule_weeks_week_start_unique unique (week_start_date)
);

create table if not exists public.schedule_loads (
  id uuid primary key default gen_random_uuid(),
  week_id uuid not null references public.schedule_weeks (id) on delete cascade,
  load_date date not null,
  slot_index smallint not null,
  constraint schedule_loads_slot_check check (slot_index between 1 and 3),
  constraint schedule_loads_week_date_slot_unique unique (week_id, load_date, slot_index)
);

create index if not exists schedule_loads_week_id_idx on public.schedule_loads (week_id);
create index if not exists schedule_loads_load_date_idx on public.schedule_loads (load_date);

-- Atomically create the week and 21 load rows (3 per day × 7 days).
create or replace function public.create_schedule_week (p_week_start date)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_week_id uuid;
  d integer;
  s integer;
  v_day date;
begin
  insert into public.schedule_weeks (week_start_date)
  values (p_week_start)
  returning id into v_week_id;

  for d in 0..6 loop
    v_day := p_week_start + d;
    for s in 1..3 loop
      insert into public.schedule_loads (week_id, load_date, slot_index)
      values (v_week_id, v_day, s);
    end loop;
  end loop;

  return v_week_id;
end;
$$;

grant execute on function public.create_schedule_week (date) to authenticated;

alter table public.schedule_weeks enable row level security;
alter table public.schedule_loads enable row level security;

create policy "schedule_weeks_authenticated_all"
  on public.schedule_weeks
  for all
  to authenticated
  using (true)
  with check (true);

create policy "schedule_loads_authenticated_all"
  on public.schedule_loads
  for all
  to authenticated
  using (true)
  with check (true);

grant select, insert, update, delete on public.schedule_weeks to authenticated;
grant select, insert, update, delete on public.schedule_loads to authenticated;
