-- =============================================================================
-- Link schedule_loads → load_slots (FK + indexes + PostgREST schema reload)
-- Run in Supabase SQL Editor as one script.
--
-- Supabase “schema visualizer” / API use PostgreSQL foreign keys. You need:
--   schedule_loads.load_slot_id  →  REFERENCES load_slots(id)
-- with IDENTICAL column types on both sides (both uuid OR both bigint, etc.).
--
-- If types differ, fix load_slots.id or schedule_loads.load_slot_id first;
-- you cannot add an FK across mismatched types.
-- =============================================================================

-- 1) Optional: ensure load_slots has sort_order (needed for create_schedule_week + app)
alter table public.load_slots
  add column if not exists sort_order integer;

update public.load_slots ls
set sort_order = sq.rn
from (
  select id, row_number() over (order by id) as rn
  from public.load_slots
) sq
where ls.id = sq.id
  and ls.sort_order is null;

alter table public.load_slots
  alter column sort_order set not null;

-- 1b) If load_slots has no rows, seed three defaults (same as original 3 loads/day)
--     driver_id / unit_id use MIN(id) only to satisfy NOT NULL — one indexed lookup each,
--     not a full table scan. Values are placeholders; edit load_slots in Studio when ready,
--     or make those columns nullable if slots are global templates (not tied to one driver).
do $$
declare
  need_driver boolean;
  need_unit boolean;
  has_name boolean;
  drv_id public.drivers.id%type;
  unt_id public.units.id%type;
begin
  if not exists (select 1 from public.load_slots) then
    begin
      select exists (
        select 1
        from information_schema.columns c
        where c.table_schema = 'public'
          and c.table_name = 'load_slots'
          and c.column_name = 'driver_id'
          and c.is_nullable = 'NO'
      ) into need_driver;

      select exists (
        select 1
        from information_schema.columns c
        where c.table_schema = 'public'
          and c.table_name = 'load_slots'
          and c.column_name = 'unit_id'
          and c.is_nullable = 'NO'
      ) into need_unit;

      select exists (
        select 1
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'load_slots'
          and column_name = 'name'
      ) into has_name;

      if need_driver then
        select min(d.id) into drv_id from public.drivers d;
        if drv_id is null then
          raise exception
            'load_slots.driver_id is NOT NULL but public.drivers has no rows. Add a driver, then re-run.';
        end if;
      end if;

      if need_unit then
        select min(u.id) into unt_id from public.units u;
        if unt_id is null then
          raise exception
            'load_slots.unit_id is NOT NULL but public.units has no rows. Add a unit, then re-run.';
        end if;
      end if;

      if has_name and need_driver and need_unit then
        insert into public.load_slots (id, sort_order, name, driver_id, unit_id) values
          (gen_random_uuid(), 1, 'Load 1', drv_id, unt_id),
          (gen_random_uuid(), 2, 'Load 2', drv_id, unt_id),
          (gen_random_uuid(), 3, 'Load 3', drv_id, unt_id);
      elsif has_name and need_driver then
        insert into public.load_slots (id, sort_order, name, driver_id) values
          (gen_random_uuid(), 1, 'Load 1', drv_id),
          (gen_random_uuid(), 2, 'Load 2', drv_id),
          (gen_random_uuid(), 3, 'Load 3', drv_id);
      elsif has_name and need_unit and not need_driver then
        insert into public.load_slots (id, sort_order, name, unit_id) values
          (gen_random_uuid(), 1, 'Load 1', unt_id),
          (gen_random_uuid(), 2, 'Load 2', unt_id),
          (gen_random_uuid(), 3, 'Load 3', unt_id);
      elsif need_driver and need_unit then
        insert into public.load_slots (id, sort_order, driver_id, unit_id) values
          (gen_random_uuid(), 1, drv_id, unt_id),
          (gen_random_uuid(), 2, drv_id, unt_id),
          (gen_random_uuid(), 3, drv_id, unt_id);
      elsif need_driver then
        insert into public.load_slots (id, sort_order, driver_id) values
          (gen_random_uuid(), 1, drv_id),
          (gen_random_uuid(), 2, drv_id),
          (gen_random_uuid(), 3, drv_id);
      elsif need_unit and not need_driver then
        insert into public.load_slots (id, sort_order, unit_id) values
          (gen_random_uuid(), 1, unt_id),
          (gen_random_uuid(), 2, unt_id),
          (gen_random_uuid(), 3, unt_id);
      elsif has_name then
        insert into public.load_slots (id, sort_order, name) values
          (gen_random_uuid(), 1, 'Load 1'),
          (gen_random_uuid(), 2, 'Load 2'),
          (gen_random_uuid(), 3, 'Load 3');
      else
        insert into public.load_slots (id, sort_order) values
          (gen_random_uuid(), 1),
          (gen_random_uuid(), 2),
          (gen_random_uuid(), 3);
      end if;
    exception
      when others then
        raise exception
          'load_slots is empty and auto-seed failed (%). Add three rows in Table Editor (all NOT NULL columns), then re-run.',
          sqlerrm;
    end;
  end if;
end $$;

-- 2) schedule_loads: FK column (uuid — change to bigint if load_slots.id is bigint)
alter table public.schedule_loads
  add column if not exists load_slot_id uuid;

-- 3) Backfill from legacy slot_index when still present
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'schedule_loads'
      and column_name = 'slot_index'
  ) then
    update public.schedule_loads sl
    set load_slot_id = ls.id
    from (
      select distinct on (sort_order) id, sort_order
      from public.load_slots
      order by sort_order, id
    ) ls
    where sl.load_slot_id is null
      and ls.sort_order = sl.slot_index;
  end if;
end $$;

-- 3b) Fallback when slot_index is gone or did not match: assign by row order per day
--     1st load row of each (week_id, load_date) → 1st load_slot by sort_order, etc.
with
slot_rank as (
  select id, row_number() over (order by sort_order, id) as rn
  from public.load_slots
),
load_rank as (
  select
    sl.id,
    row_number() over (partition by sl.week_id, sl.load_date order by sl.id) as rn
  from public.schedule_loads sl
  where sl.load_slot_id is null
)
update public.schedule_loads sl
set load_slot_id = sr.id
from load_rank lr
join slot_rank sr on sr.rn = lr.rn
where sl.id = lr.id;

-- 3c) Delete any rows still null (extra loads per day vs slot count, or empty load_slots earlier)
do $$
declare
  slot_count integer;
  deleted_count integer;
begin
  select count(*)::integer into slot_count from public.load_slots;

  if slot_count = 0 and exists (
    select 1 from public.schedule_loads where load_slot_id is null
  ) then
    raise exception
      'public.load_slots is still empty (auto-seed may have failed). Add slot rows with sort_order, then re-run.';
  end if;

  delete from public.schedule_loads where load_slot_id is null;
  get diagnostics deleted_count = row_count;

  if deleted_count > 0 then
    raise warning
      'schedule_loads: removed % row(s) that could not be mapped to a load_slot (usually more loads per day than slots). Recreate weeks with “New week” if needed.',
      deleted_count;
  end if;
end $$;

-- 3d) Duplicate (week_id, load_date, load_slot_id) — keep smallest id (avoids unique failure)
do $$
declare
  deduped integer;
begin
  delete from public.schedule_loads a
  using public.schedule_loads b
  where a.week_id = b.week_id
    and a.load_date = b.load_date
    and a.load_slot_id = b.load_slot_id
    and a.id > b.id;
  get diagnostics deduped = row_count;
  if deduped > 0 then
    raise warning
      'schedule_loads: removed % duplicate row(s) (same week/day/slot); kept smallest id.',
      deduped;
  end if;
end $$;

-- 4) Fail fast: null slot or orphan id (fix data before continuing)
do $$
begin
  if exists (select 1 from public.schedule_loads where load_slot_id is null) then
    raise exception
      'schedule_loads still has null load_slot_id after cleanup; check for triggers or manual inserts.';
  end if;

  if exists (
    select 1
    from public.schedule_loads sl
    where not exists (
      select 1 from public.load_slots ls where ls.id = sl.load_slot_id
    )
  ) then
    raise exception
      'schedule_loads.load_slot_id has values not found in load_slots.id. Clean or update those rows first.';
  end if;
end $$;

-- 5) NOT NULL on load_slot_id (required for solid FK)
alter table public.schedule_loads
  alter column load_slot_id set not null;

-- 6) Drop legacy slot_index + old uniqueness on slot_index (safe if already gone)
alter table public.schedule_loads
  drop constraint if exists schedule_loads_slot_check;

alter table public.schedule_loads
  drop constraint if exists schedule_loads_week_date_slot_unique;

alter table public.schedule_loads
  drop column if exists slot_index;

-- 7) THE RELATIONSHIP: foreign key (this is what the schema graph uses)
alter table public.schedule_loads
  drop constraint if exists schedule_loads_load_slot_id_fkey;

alter table public.schedule_loads
  add constraint schedule_loads_load_slot_id_fkey
  foreign key (load_slot_id)
  references public.load_slots (id)
  on delete restrict
  on update cascade;

-- 8) One row per week + day + slot (for app + RPC)
alter table public.schedule_loads
  drop constraint if exists schedule_loads_week_date_load_slot_uniq;

alter table public.schedule_loads
  add constraint schedule_loads_week_date_load_slot_uniq
  unique (week_id, load_date, load_slot_id);

create index if not exists schedule_loads_load_slot_id_idx
  on public.schedule_loads (load_slot_id);

-- 9) RPC still inserts by load_slot_id (replace if you use a different function body)
create or replace function public.create_schedule_week (p_week_start date)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_week_id uuid;
  d integer;
  v_day date;
  r record;
begin
  insert into public.schedule_weeks (week_start_date)
  values (p_week_start)
  returning id into v_week_id;

  for d in 0..6 loop
    v_day := p_week_start + d;
    for r in
      select id as slot_id
      from public.load_slots
      order by sort_order, id
    loop
      insert into public.schedule_loads (week_id, load_date, load_slot_id)
      values (v_week_id, v_day, r.slot_id);
    end loop;
  end loop;

  return v_week_id;
end;
$$;

grant execute on function public.create_schedule_week (date) to authenticated;

grant select on public.load_slots to authenticated;

-- 10) Tell PostgREST / Studio to refresh (relationship + embeds show up reliably)
notify pgrst, 'reload schema';
