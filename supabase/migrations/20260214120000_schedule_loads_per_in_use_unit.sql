-- schedule_loads: one block of rows per in_use_units assignment (7 days × 3 slots).
-- Removes legacy week-only rows (no unit). New weeks are empty until assignments exist;
-- ensure_schedule_loads_for_week fills rows for each current assignment.

alter table public.schedule_loads
  add column if not exists in_use_unit_id uuid references public.in_use_units (id) on delete cascade;

alter table public.schedule_loads
  drop constraint if exists schedule_loads_week_date_load_slot_uniq;

alter table public.schedule_loads
  drop constraint if exists schedule_loads_week_day_slot_unit_uniq;

delete from public.schedule_loads where in_use_unit_id is null;

delete from public.schedule_loads a
using public.schedule_loads b
where a.week_id = b.week_id
  and a.load_date = b.load_date
  and a.load_slot_id = b.load_slot_id
  and a.in_use_unit_id is not distinct from b.in_use_unit_id
  and a.id > b.id;

do $$
begin
  if not exists (
    select 1
    from pg_constraint c
    join pg_class t on c.conrelid = t.oid
    join pg_namespace n on t.relnamespace = n.oid
    where n.nspname = 'public'
      and t.relname = 'schedule_loads'
      and c.conname = 'schedule_loads_week_day_slot_unit_uniq'
  ) then
    alter table public.schedule_loads
      add constraint schedule_loads_week_day_slot_unit_uniq
      unique (week_id, load_date, load_slot_id, in_use_unit_id);
  end if;
end $$;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'schedule_loads'
      and column_name = 'in_use_unit_id'
      and is_nullable = 'YES'
  ) then
    alter table public.schedule_loads
      alter column in_use_unit_id set not null;
  end if;
end $$;

create or replace function public.ensure_schedule_loads_for_week (p_week_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  ws date;
begin
  select week_start_date into ws from public.schedule_weeks where id = p_week_id;
  if ws is null then
    return;
  end if;

  insert into public.schedule_loads (week_id, load_date, load_slot_id, in_use_unit_id)
  select
    p_week_id,
    (ws + d.day_offset)::date,
    ls.id,
    iu.id
  from public.in_use_units iu
  cross join lateral unnest(array[0, 1, 2, 3, 4, 5, 6]) as d(day_offset)
  cross join lateral (
    select id
    from public.load_slots
    order by sort_order nulls last, id
    limit 3
  ) ls
  on conflict (week_id, load_date, load_slot_id, in_use_unit_id) do nothing;
end;
$$;

create or replace function public.create_schedule_week (p_week_start date)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_week_id uuid;
begin
  insert into public.schedule_weeks (week_start_date)
  values (p_week_start)
  returning id into v_week_id;

  return v_week_id;
end;
$$;

grant execute on function public.ensure_schedule_loads_for_week (uuid) to authenticated;

notify pgrst, 'reload schema';
