-- Completed weeks: do not scaffold schedule_loads for every current in_use_units row.
-- Past weeks keep only units already recorded via schedule_assignments / existing loads.

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

  if public.week_is_schedule_complete(ws) then
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
    p_week_id,
    (ws + d.day_offset)::date,
    ls.id,
    iu.id,
    public.ensure_schedule_assignment(p_week_id, iu.id)
  from public.in_use_units iu
  cross join lateral unnest(array[0, 1, 2, 3, 4, 5, 6]) as d(day_offset)
  cross join lateral (
    select id
    from public.load_slots
    order by sort_order nulls last, id
    limit 3
  ) ls
  on conflict (week_id, load_date, load_slot_id, in_use_unit_id) do nothing;

  update public.schedule_loads sl
  set schedule_assignment_id = public.ensure_schedule_assignment(sl.week_id, sl.in_use_unit_id)
  where sl.week_id = p_week_id
    and sl.in_use_unit_id is not null
    and sl.schedule_assignment_id is null;
end;
$$;

notify pgrst, 'reload schema';
