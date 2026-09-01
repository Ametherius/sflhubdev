-- Restore Jul 12 assignments wiped while that week was still open,
-- and tighten vacate so it only clears the current calendar week (not other open weeks).

create or replace function public.week_is_schedule_complete (p_week_start date)
returns boolean
language sql
stable
set search_path = public
as $$
  select p_week_start is not null
    and (current_date > (p_week_start + 6));
$$;

-- Vacate: never touch completed weeks' rows (detach only).
-- For open weeks: only remove schedule data for the week that contains today.
create or replace function public.archive_in_use_unit (p_in_use_unit_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_current_week_id uuid;
begin
  if p_in_use_unit_id is null then
    return;
  end if;

  select sw.id
  into v_current_week_id
  from public.schedule_weeks sw
  where sw.week_start_date <= current_date
    and (sw.week_start_date + 6) >= current_date
  order by sw.week_start_date desc
  limit 1;

  if v_current_week_id is not null then
    delete from public.schedule_loads sl
    where sl.week_id = v_current_week_id
      and sl.in_use_unit_id = p_in_use_unit_id;

    delete from public.schedule_loads sl
    using public.schedule_assignments sa
    where sl.schedule_assignment_id = sa.id
      and sa.week_id = v_current_week_id
      and sa.in_use_unit_id = p_in_use_unit_id;

    delete from public.schedule_assignments sa
    where sa.week_id = v_current_week_id
      and sa.in_use_unit_id = p_in_use_unit_id;
  end if;

  -- All other weeks (past and future): keep rows, detach from live board id.
  update public.schedule_loads sl
  set in_use_unit_id = null
  where sl.in_use_unit_id = p_in_use_unit_id
    and (v_current_week_id is null or sl.week_id is distinct from v_current_week_id);

  update public.schedule_assignments sa
  set in_use_unit_id = null
  where sa.in_use_unit_id = p_in_use_unit_id
    and (v_current_week_id is null or sa.week_id is distinct from v_current_week_id);
end;
$$;

-- Restore missing Jul 12 driver/unit assignment snapshots from Jul 5.
insert into public.schedule_assignments (
  week_id,
  in_use_unit_id,
  week_only,
  driverid,
  unitid,
  driver_name,
  driver_phone,
  driver_user,
  driver_pass,
  driver_pin,
  driver_division,
  unit_label,
  unit_petro,
  unit_petro_pin,
  unit_ufa,
  unit_ufa_pin
)
select
  '334c52bc-1dce-43dd-aae7-ae630c08fc24'::uuid,
  src.in_use_unit_id,
  coalesce(src.week_only, false),
  src.driverid,
  src.unitid,
  src.driver_name,
  src.driver_phone,
  src.driver_user,
  src.driver_pass,
  src.driver_pin,
  src.driver_division,
  src.unit_label,
  src.unit_petro,
  src.unit_petro_pin,
  src.unit_ufa,
  src.unit_ufa_pin
from public.schedule_assignments src
join public.schedule_weeks sw_src on sw_src.id = src.week_id
where sw_src.week_start_date = '2026-07-05'
  and (
    nullif(trim(coalesce(src.driver_name, '')), '') is not null
    or nullif(trim(coalesce(src.unit_label, '')), '') is not null
  )
  and not exists (
    select 1
    from public.schedule_assignments existing
    where existing.week_id = '334c52bc-1dce-43dd-aae7-ae630c08fc24'::uuid
      and (
        (
          src.in_use_unit_id is not null
          and existing.in_use_unit_id = src.in_use_unit_id
        )
        or (
          coalesce(existing.driver_name, '') = coalesce(src.driver_name, '')
          and coalesce(existing.unit_label, '') = coalesce(src.unit_label, '')
        )
      )
  );

-- Scaffold load rows for restored Jul 12 assignments (completed weeks skip ensure_*).
insert into public.schedule_loads (
  week_id,
  load_date,
  load_slot_id,
  in_use_unit_id,
  schedule_assignment_id
)
select
  sa.week_id,
  (sw.week_start_date + d.day_offset)::date,
  ls.id,
  sa.in_use_unit_id,
  sa.id
from public.schedule_assignments sa
join public.schedule_weeks sw on sw.id = sa.week_id
cross join lateral unnest(array[0, 1, 2, 3, 4, 5, 6]) as d(day_offset)
cross join lateral (
  select id
  from public.load_slots
  order by sort_order nulls last, id
  limit 3
) ls
where sa.week_id = '334c52bc-1dce-43dd-aae7-ae630c08fc24'::uuid
on conflict do nothing;

notify pgrst, 'reload schema';
