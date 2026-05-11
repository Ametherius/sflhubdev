-- =============================================================================
-- Manual option (3): insert three load_slots, then run
--   supabase/scripts/link_schedule_loads_to_load_slots.sql
--
-- schedule_loads.load_slot_id is uuid → load_slots.id should be uuid here.
-- If load_slots.driver_id or unit_id is NOT NULL, uses MIN(drivers.id) / MIN(units.id)
-- (cheap on large tables — uses PK). Arbitrary placeholders; edit rows in Studio after.
-- =============================================================================

alter table public.load_slots
  add column if not exists sort_order integer;

do $$
declare
  need_driver boolean;
  need_unit boolean;
  has_name boolean;
  drv_id public.drivers.id%type;
  unt_id public.units.id%type;
begin
  if exists (select 1 from public.load_slots limit 1) then
    raise notice 'load_slots already has rows — skipping insert.';
    return;
  end if;

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
        'load_slots.driver_id is NOT NULL but public.drivers is empty. Add a driver first.';
    end if;
  end if;

  if need_unit then
    select min(u.id) into unt_id from public.units u;
    if unt_id is null then
      raise exception
        'load_slots.unit_id is NOT NULL but public.units is empty. Add a unit first.';
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
exception
  when others then
    raise exception
      'Insert failed (%). Add rows in Table Editor with every NOT NULL column filled.',
      sqlerrm;
end $$;

notify pgrst, 'reload schema';
