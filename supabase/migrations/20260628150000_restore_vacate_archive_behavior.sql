-- Restore vacate behavior: open weeks delete schedule data; completed weeks archive labels.

create or replace function public.archive_in_use_unit (p_in_use_unit_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  r record;
  v_assignment_id uuid;
begin
  if p_in_use_unit_id is null then
    return;
  end if;

  delete from public.schedule_loads sl
  using public.schedule_weeks sw
  where sl.week_id = sw.id
    and sl.in_use_unit_id = p_in_use_unit_id
    and not public.week_is_schedule_complete(sw.week_start_date);

  delete from public.schedule_loads sl
  using public.schedule_assignments sa,
    public.schedule_weeks sw
  where sl.schedule_assignment_id = sa.id
    and sa.week_id = sw.id
    and sa.in_use_unit_id = p_in_use_unit_id
    and not public.week_is_schedule_complete(sw.week_start_date);

  delete from public.schedule_assignments sa
  using public.schedule_weeks sw
  where sa.week_id = sw.id
    and sa.in_use_unit_id = p_in_use_unit_id
    and not public.week_is_schedule_complete(sw.week_start_date);

  for r in
    select distinct sl.week_id, sw.week_start_date
    from public.schedule_loads sl
    join public.schedule_weeks sw on sw.id = sl.week_id
    where sl.in_use_unit_id = p_in_use_unit_id
      and public.week_is_schedule_complete(sw.week_start_date)
  loop
    v_assignment_id := public.ensure_schedule_assignment(r.week_id, p_in_use_unit_id);

    update public.schedule_assignments sa
    set in_use_unit_id = null
    where sa.id = v_assignment_id;

    update public.schedule_loads sl
    set
      schedule_assignment_id = v_assignment_id,
      in_use_unit_id = null
    where sl.week_id = r.week_id
      and sl.in_use_unit_id = p_in_use_unit_id;
  end loop;
end;
$$;

notify pgrst, 'reload schema';
