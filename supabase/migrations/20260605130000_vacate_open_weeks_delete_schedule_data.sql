-- Vacating on current/future weeks removes schedule rows entirely.
-- Past (completed) weeks still archive driver/unit labels and keep load history.

create or replace function public.week_is_schedule_complete (p_week_start date)
returns boolean
language sql
stable
set search_path = public
as $$
  select p_week_start is not null
    and current_date > (p_week_start + 6);
$$;

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

  -- Open weeks (today through week end): delete schedule data for this assignment.
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

  -- Completed weeks: snapshot labels and keep loads linked to the assignment row.
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

-- Drop ghost archived rows left on open weeks from earlier vacates.
delete from public.schedule_loads sl
using public.schedule_weeks sw
where sl.week_id = sw.id
  and not public.week_is_schedule_complete(sw.week_start_date)
  and sl.in_use_unit_id is null;

delete from public.schedule_assignments sa
using public.schedule_weeks sw
where sa.week_id = sw.id
  and not public.week_is_schedule_complete(sw.week_start_date)
  and sa.in_use_unit_id is null;

grant execute on function public.week_is_schedule_complete (date) to authenticated;

notify pgrst, 'reload schema';
