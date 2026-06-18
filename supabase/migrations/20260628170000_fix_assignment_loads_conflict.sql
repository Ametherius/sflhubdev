-- Fix: ON CONFLICT could not match partial unique index for schedule_assignment_id.

drop index if exists public.schedule_loads_week_day_slot_assignment_uniq;

create unique index if not exists schedule_loads_week_day_slot_assignment_uniq
  on public.schedule_loads (week_id, load_date, load_slot_id, schedule_assignment_id);

create or replace function public.ensure_schedule_loads_for_assignment (
  p_assignment_id uuid
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  a record;
  ws date;
begin
  if p_assignment_id is null then
    return;
  end if;

  select sa.id, sa.week_id, sa.in_use_unit_id
  into a
  from public.schedule_assignments sa
  where sa.id = p_assignment_id;

  if a.id is null then
    return;
  end if;

  select week_start_date into ws
  from public.schedule_weeks
  where id = a.week_id;

  if ws is null then
    return;
  end if;

  insert into public.schedule_loads (
    week_id,
    load_date,
    load_slot_id,
    in_use_unit_id,
    schedule_assignment_id
  )
  select
    a.week_id,
    (ws + d.day_offset)::date,
    ls.id,
    a.in_use_unit_id,
    a.id
  from lateral unnest(array[0, 1, 2, 3, 4, 5, 6]) as d(day_offset)
  cross join lateral (
    select id
    from public.load_slots
    order by sort_order nulls last, id
    limit 3
  ) ls
  where not exists (
    select 1
    from public.schedule_loads sl
    where sl.week_id = a.week_id
      and sl.load_date = (ws + d.day_offset)::date
      and sl.load_slot_id = ls.id
      and sl.schedule_assignment_id = a.id
  );
end;
$$;

notify pgrst, 'reload schema';
