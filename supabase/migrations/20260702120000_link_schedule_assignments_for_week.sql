-- Link schedule_loads to schedule_assignments for weeks that rolled over while loads
-- still only had in_use_unit_id (common when a week closes before snapshots are wired).

create or replace function public.link_schedule_assignments_for_week (p_week_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  v_assignment_id uuid;
begin
  if p_week_id is null then
    return;
  end if;

  update public.schedule_loads sl
  set schedule_assignment_id = sa.id
  from public.schedule_assignments sa
  where sl.week_id = p_week_id
    and sl.schedule_assignment_id is null
    and sl.in_use_unit_id is not null
    and sa.week_id = sl.week_id
    and sa.in_use_unit_id = sl.in_use_unit_id;

  for r in
    select distinct sl.in_use_unit_id
    from public.schedule_loads sl
    where sl.week_id = p_week_id
      and sl.schedule_assignment_id is null
      and sl.in_use_unit_id is not null
  loop
    v_assignment_id := public.ensure_schedule_assignment(p_week_id, r.in_use_unit_id);
    if v_assignment_id is not null then
      update public.schedule_loads sl
      set schedule_assignment_id = v_assignment_id
      where sl.week_id = p_week_id
        and sl.in_use_unit_id = r.in_use_unit_id
        and sl.schedule_assignment_id is null;
    end if;
  end loop;
end;
$$;

grant execute on function public.link_schedule_assignments_for_week (uuid) to authenticated;

-- One-time backfill for any week with orphaned loads.
do $$
declare
  w record;
begin
  for w in
    select distinct week_id
    from public.schedule_loads
    where schedule_assignment_id is null
      and in_use_unit_id is not null
  loop
    perform public.link_schedule_assignments_for_week(w.week_id);
  end loop;
end;
$$;

notify pgrst, 'reload schema';
