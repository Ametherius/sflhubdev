-- Week-scoped assignment snapshots + per-slot load data; preserve history when vacating/deleting.

-- 1) Assignment snapshots (driver/unit labels frozen per week)
create table if not exists public.schedule_assignments (
  id uuid primary key default gen_random_uuid(),
  week_id uuid not null references public.schedule_weeks (id) on delete cascade,
  in_use_unit_id uuid references public.in_use_units (id) on delete set null,
  driverid uuid references public.drivers (id) on delete set null,
  unitid uuid references public.units (id) on delete set null,
  driver_name text,
  driver_phone text,
  driver_user text,
  driver_pass text,
  driver_pin text,
  driver_division text,
  unit_label text,
  unit_petro text,
  unit_petro_pin text,
  unit_ufa text,
  unit_ufa_pin text,
  created_at timestamptz not null default now()
);

create unique index if not exists schedule_assignments_week_in_use_unit_uniq
  on public.schedule_assignments (week_id, in_use_unit_id)
  where in_use_unit_id is not null;

create index if not exists schedule_assignments_week_id_idx
  on public.schedule_assignments (week_id);

alter table public.schedule_assignments enable row level security;

drop policy if exists schedule_assignments_authenticated_all on public.schedule_assignments;
create policy schedule_assignments_authenticated_all
  on public.schedule_assignments
  for all
  to authenticated
  using (true)
  with check (true);

grant select, insert, update, delete on public.schedule_assignments to authenticated;

-- 2) Per-slot load fields (independent of loadsheet library after assign)
alter table public.schedule_loads
  add column if not exists schedule_assignment_id uuid references public.schedule_assignments (id) on delete set null,
  add column if not exists load_category text,
  add column if not exists usd_cad_rate text;

-- 3) Vacating a unit must not delete historical week rows
alter table public.schedule_loads
  drop constraint if exists schedule_loads_in_use_unit_id_fkey;

alter table public.schedule_loads
  add constraint schedule_loads_in_use_unit_id_fkey
  foreign key (in_use_unit_id)
  references public.in_use_units (id)
  on delete set null;

create index if not exists schedule_loads_schedule_assignment_id_idx
  on public.schedule_loads (schedule_assignment_id);

-- Ensure one assignment row per (week, in_use_unit) with driver/unit snapshot
create or replace function public.ensure_schedule_assignment (
  p_week_id uuid,
  p_in_use_unit_id uuid
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
  if p_week_id is null or p_in_use_unit_id is null then
    return null;
  end if;

  select id into v_id
  from public.schedule_assignments
  where week_id = p_week_id
    and in_use_unit_id = p_in_use_unit_id;

  if v_id is not null then
    return v_id;
  end if;

  select dr.id, dr.name, dr.phone, dr."user", dr.pass, dr.pin, dr.division
  into d
  from public.in_use_units iu
  join public.drivers dr on dr.id = iu.driverid
  where iu.id = p_in_use_unit_id;

  select un.id, un.unit, un.petro, un."petroPIN", un.ufa, un."ufaPIN"
  into u
  from public.in_use_units iu
  join public.units un on un.id = iu.unitid
  where iu.id = p_in_use_unit_id;

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
    unit_ufa_pin
  )
  values (
    p_week_id,
    p_in_use_unit_id,
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
    u."ufaPIN"
  )
  returning id into v_id;

  return v_id;
end;
$$;

-- Before deleting in_use_units: snapshot every week that has loads, link rows to snapshot
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

  for r in
    select distinct sl.week_id
    from public.schedule_loads sl
    where sl.in_use_unit_id = p_in_use_unit_id
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

create or replace function public.archive_in_use_unit_before_delete ()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  perform public.archive_in_use_unit(old.id);
  return old;
end;
$$;

drop trigger if exists archive_in_use_unit_before_delete on public.in_use_units;
create trigger archive_in_use_unit_before_delete
  before delete on public.in_use_units
  for each row
  execute function public.archive_in_use_unit_before_delete ();

-- Archive live assignments when a driver is removed
create or replace function public.archive_driver_in_use_units (p_driver_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  r record;
begin
  if p_driver_id is null then
    return;
  end if;

  for r in
    select id from public.in_use_units where driverid = p_driver_id
  loop
    perform public.archive_in_use_unit(r.id);
  end loop;
end;
$$;

create or replace function public.archive_driver_before_delete ()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  perform public.archive_driver_in_use_units(old.id);
  return old;
end;
$$;

drop trigger if exists archive_driver_before_delete on public.drivers;
create trigger archive_driver_before_delete
  before delete on public.drivers
  for each row
  execute function public.archive_driver_before_delete ();

-- Fill schedule rows for the week; attach assignment snapshot ids
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

grant execute on function public.ensure_schedule_assignment (uuid, uuid) to authenticated;
grant execute on function public.archive_in_use_unit (uuid) to authenticated;
grant execute on function public.archive_driver_in_use_units (uuid) to authenticated;

-- Backfill assignments + links for existing data
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
  unit_ufa_pin
)
select distinct
  sl.week_id,
  iu.id,
  dr.id,
  un.id,
  dr.name,
  dr.phone,
  dr."user",
  dr.pass,
  dr.pin,
  dr.division,
  un.unit::text,
  un.petro,
  un."petroPIN",
  un.ufa,
  un."ufaPIN"
from public.schedule_loads sl
join public.in_use_units iu on iu.id = sl.in_use_unit_id
left join public.drivers dr on dr.id = iu.driverid
left join public.units un on un.id = iu.unitid
where sl.in_use_unit_id is not null
  and not exists (
    select 1
    from public.schedule_assignments sa
    where sa.week_id = sl.week_id
      and sa.in_use_unit_id = iu.id
  );

update public.schedule_loads sl
set schedule_assignment_id = sa.id
from public.schedule_assignments sa
where sl.week_id = sa.week_id
  and sl.in_use_unit_id is not distinct from sa.in_use_unit_id
  and sl.schedule_assignment_id is null;

update public.schedule_loads sl
set
  load_category = ls.load_category,
  usd_cad_rate = ls.usd_cad_rate
from public.loadsheets ls
where sl.loadsheet_id = ls.id
  and sl.load_category is null;

do $$
begin
  begin
    execute 'alter publication supabase_realtime add table public.schedule_assignments';
  exception
    when duplicate_object then null;
    when undefined_table then null;
  end;
end $$;

notify pgrst, 'reload schema';
