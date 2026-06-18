-- Vacating removes schedule data on all weeks (vacated units stay off the schedule).

create or replace function public.archive_in_use_unit (p_in_use_unit_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if p_in_use_unit_id is null then
    return;
  end if;

  delete from public.schedule_loads sl
  using public.schedule_assignments sa
  where sl.schedule_assignment_id = sa.id
    and sa.in_use_unit_id = p_in_use_unit_id;

  delete from public.schedule_loads
  where in_use_unit_id = p_in_use_unit_id;

  delete from public.schedule_assignments
  where in_use_unit_id = p_in_use_unit_id;
end;
$$;

-- Remove vacated ghost rows (archived snapshots with no live in_use_unit).
delete from public.schedule_loads sl
using public.schedule_assignments sa
where sl.schedule_assignment_id = sa.id
  and sa.in_use_unit_id is null;

delete from public.schedule_loads
where in_use_unit_id is null;

delete from public.schedule_assignments
where in_use_unit_id is null;

notify pgrst, 'reload schema';
