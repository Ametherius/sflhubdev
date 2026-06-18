-- Week-only schedule assignments (past weeks or explicit week scope without live board).

alter table public.schedule_assignments
  add column if not exists week_only boolean not null default false;

create unique index if not exists schedule_assignments_week_driver_unit_week_only_uniq
  on public.schedule_assignments (week_id, driverid, unitid)
  where week_only = true;

create unique index if not exists schedule_loads_week_day_slot_assignment_uniq
  on public.schedule_loads (week_id, load_date, load_slot_id, schedule_assignment_id);

create or replace function public.create_schedule_week_assignment (
  p_week_id uuid,
  p_driver_id uuid,
  p_unit_id uuid,
  p_in_use_unit_id uuid default null,
  p_week_only boolean default false
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_id uuid;
  d record;
  u record;
begin
  if p_week_id is null or p_driver_id is null or p_unit_id is null then
    return null;
  end if;

  if p_week_only then
    select id into v_id
    from public.schedule_assignments
    where week_id = p_week_id
      and driverid = p_driver_id
      and unitid = p_unit_id
      and week_only = true;

    if v_id is not null then
      return v_id;
    end if;
  elsif p_in_use_unit_id is not null then
    select id into v_id
    from public.schedule_assignments
    where week_id = p_week_id
      and in_use_unit_id = p_in_use_unit_id;

    if v_id is not null then
      return v_id;
    end if;
  end if;

  select dr.id, dr.name, dr.phone, dr."user", dr.pass, dr.pin, dr.division
  into d
  from public.drivers dr
  where dr.id = p_driver_id;

  select un.id, un.unit, un.petro, un."petroPIN", un.ufa, un."ufaPIN"
  into u
  from public.units un
  where un.id = p_unit_id;

  if d.id is null or u.id is null then
    return null;
  end if;

  insert into public.schedule_assignments (
    week_id,
    in_use_unit_id,
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
    unit_ufa_pin,
    week_only
  )
  values (
    p_week_id,
    case when p_week_only then null else p_in_use_unit_id end,
    d.id,
    u.id,
    d.name,
    d.phone,
    d."user",
    d.pass,
    d.pin,
    d.division,
    u.unit::text,
    u.petro,
    u."petroPIN",
    u.ufa,
    u."ufaPIN",
    coalesce(p_week_only, false)
  )
  returning id into v_id;

  return v_id;
end;
$$;

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

create or replace function public.ensure_schedule_loads_for_unit_week (
  p_week_id uuid,
  p_in_use_unit_id uuid
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  ws date;
  v_assignment_id uuid;
begin
  if p_week_id is null or p_in_use_unit_id is null then
    return;
  end if;

  select week_start_date into ws from public.schedule_weeks where id = p_week_id;
  if ws is null then
    return;
  end if;

  if public.week_is_schedule_complete(ws) then
    return;
  end if;

  v_assignment_id := public.ensure_schedule_assignment(p_week_id, p_in_use_unit_id);

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
    p_in_use_unit_id,
    v_assignment_id
  from lateral unnest(array[0, 1, 2, 3, 4, 5, 6]) as d(day_offset)
  cross join lateral (
    select id
    from public.load_slots
    order by sort_order nulls last, id
    limit 3
  ) ls
  on conflict (week_id, load_date, load_slot_id, in_use_unit_id) do nothing;

  update public.schedule_loads sl
  set schedule_assignment_id = v_assignment_id
  where sl.week_id = p_week_id
    and sl.in_use_unit_id = p_in_use_unit_id
    and sl.schedule_assignment_id is null;
end;
$$;

grant execute on function public.create_schedule_week_assignment (uuid, uuid, uuid, uuid, boolean) to authenticated;
grant execute on function public.ensure_schedule_loads_for_assignment (uuid) to authenticated;
grant execute on function public.ensure_schedule_loads_for_unit_week (uuid, uuid) to authenticated;

notify pgrst, 'reload schema';
