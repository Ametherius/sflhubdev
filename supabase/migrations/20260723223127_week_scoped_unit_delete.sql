-- Week-scoped unit removal + stop vacate from wiping past weeks.

-- Helper used by vacate / ensure (may be missing on some projects).
create or replace function public.week_is_schedule_complete (p_week_start date)
returns boolean
language sql
stable
set search_path = public
as $$
  select p_week_start is not null
    and (current_date > (p_week_start + 6));
$$;

grant execute on function public.week_is_schedule_complete (date) to authenticated;

-- Vacating the live board must NOT delete completed/past week history.
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

  -- Open weeks only: remove schedule data for this live unit.
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

  -- Completed weeks: keep snapshot rows, detach from live board id.
  for r in
    select distinct sl.week_id
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

  update public.schedule_assignments sa
  set in_use_unit_id = null
  from public.schedule_weeks sw
  where sa.week_id = sw.id
    and sa.in_use_unit_id = p_in_use_unit_id
    and public.week_is_schedule_complete(sw.week_start_date);
end;
$$;

-- Per-week exclusions so "Delete unit" on a live week sticks (ensure won't re-add).
create table if not exists public.schedule_week_unit_exclusions (
  week_id uuid not null references public.schedule_weeks (id) on delete cascade,
  in_use_unit_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (week_id, in_use_unit_id)
);

create index if not exists schedule_week_unit_exclusions_week_id_idx
  on public.schedule_week_unit_exclusions (week_id);

alter table public.schedule_week_unit_exclusions enable row level security;

drop policy if exists schedule_week_unit_exclusions_select on public.schedule_week_unit_exclusions;
drop policy if exists schedule_week_unit_exclusions_insert on public.schedule_week_unit_exclusions;
drop policy if exists schedule_week_unit_exclusions_delete on public.schedule_week_unit_exclusions;

create policy schedule_week_unit_exclusions_select
  on public.schedule_week_unit_exclusions for select to authenticated using (true);

create policy schedule_week_unit_exclusions_insert
  on public.schedule_week_unit_exclusions for insert to authenticated
  with check (public.is_admin());

create policy schedule_week_unit_exclusions_delete
  on public.schedule_week_unit_exclusions for delete to authenticated
  using (public.is_admin());

grant select, insert, delete on public.schedule_week_unit_exclusions to authenticated;

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
  where not exists (
    select 1
    from public.schedule_week_unit_exclusions ex
    where ex.week_id = p_week_id
      and ex.in_use_unit_id = iu.id
  )
  on conflict (week_id, load_date, load_slot_id, in_use_unit_id) do nothing;

  update public.schedule_loads sl
  set schedule_assignment_id = public.ensure_schedule_assignment(sl.week_id, sl.in_use_unit_id)
  where sl.week_id = p_week_id
    and sl.in_use_unit_id is not null
    and sl.schedule_assignment_id is null
    and not exists (
      select 1
      from public.schedule_week_unit_exclusions ex
      where ex.week_id = p_week_id
        and ex.in_use_unit_id = sl.in_use_unit_id
    );
end;
$$;

-- One-time: remove Yurii / unit 80 from the current week only (week of 2026-07-19).
do $$
declare
  v_week_id uuid := '1bd04383-e6c0-4c19-92f5-e421f38e4779';
  v_in_use uuid := '7b1c76a8-f19c-4a32-95b4-c14b359d010b';
begin
  delete from public.schedule_loads
  where week_id = v_week_id
    and (
      in_use_unit_id = v_in_use
      or schedule_assignment_id in (
        select id from public.schedule_assignments
        where week_id = v_week_id
          and in_use_unit_id = v_in_use
      )
    );

  delete from public.schedule_assignments
  where week_id = v_week_id
    and in_use_unit_id = v_in_use;

  insert into public.schedule_week_unit_exclusions (week_id, in_use_unit_id)
  values (v_week_id, v_in_use)
  on conflict do nothing;
end $$;

notify pgrst, 'reload schema';
