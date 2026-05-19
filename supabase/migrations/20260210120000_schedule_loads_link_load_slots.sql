-- Links schedule_loads.load_slot_id → load_slots.id (replaces slot_index).
-- Idempotent: safe to re-run after fixing data.
--
-- Requires BEFORE RUN:
--   • public.schedule_loads exists (from 20260204120000_schedule_weeks_and_loads.sql)
--   • public.load_slots with column id (uuid, or match load_slot_id type later)
--   • For each distinct slot_index in schedule_loads, a load_slots row whose sort_order
--     equals that index after backfill (see below)
--
-- sort_order: created here if missing, then filled from slot_number / position / ordinal /
-- "order" when present; otherwise row_number() by id. Edit the DO block if you use another name.

-- ── Preconditions (clear errors in SQL Editor) ─────────────────────────────
do $$
begin
  if not exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'schedule_loads'
  ) then
    raise exception 'Run 20260204120000_schedule_weeks_and_loads.sql first (table schedule_loads is missing).';
  end if;

  if not exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'load_slots'
  ) then
    raise exception 'Table public.load_slots is missing. Create it before this migration.';
  end if;
end $$;

-- ── 0) Ensure load_slots.sort_order exists and every row has a value ─────────
alter table public.load_slots
  add column if not exists sort_order integer;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'load_slots'
      and column_name = 'slot_number'
  ) then
    execute 'update public.load_slots set sort_order = slot_number where sort_order is null';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'load_slots'
      and column_name = 'position'
  ) then
    execute 'update public.load_slots set sort_order = "position" where sort_order is null';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'load_slots'
      and column_name = 'ordinal'
  ) then
    execute 'update public.load_slots set sort_order = ordinal where sort_order is null';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'load_slots'
      and column_name = 'order'
  ) then
    execute 'update public.load_slots set sort_order = "order" where sort_order is null';
  end if;
end $$;

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

-- ── 0b) Seed three default slots when load_slots is empty
--     Builds INSERT per row so NOT NULL columns without defaults (e.g. origin) get safe placeholders.
do $$
declare
  need_driver boolean;
  need_unit boolean;
  drv_id text;
  unt_id text;
  n int;
  col_names text[];
  col_exprs text[];
  sql text;
  extra record;
begin
  if exists (select 1 from public.load_slots limit 1) then
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

  if need_driver then
    select d.id::text into drv_id from public.drivers d order by d.id limit 1;
    if drv_id is null then
      raise exception
        'load_slots.driver_id is NOT NULL but public.drivers has no rows. Add a driver first.';
    end if;
  end if;

  if need_unit then
    select u.id::text into unt_id from public.units u order by u.id limit 1;
    if unt_id is null then
      raise exception
        'load_slots.unit_id is NOT NULL but public.units has no rows. Add a unit first.';
    end if;
  end if;

  for n in 1..3 loop
    col_names := array[]::text[];
    col_exprs := array[]::text[];

    col_names := array_append(col_names, 'id');
    col_exprs := array_append(col_exprs, quote_literal(gen_random_uuid()::text) || '::uuid');

    col_names := array_append(col_names, 'sort_order');
    col_exprs := array_append(col_exprs, n::text);

    if exists (
      select 1
      from information_schema.columns c
      where c.table_schema = 'public'
        and c.table_name = 'load_slots'
        and c.column_name = 'slot_index'
    ) then
      col_names := array_append(col_names, 'slot_index');
      -- Many schemas use 0-based slot_index (0,1,2); sort_order stays 1-based.
      col_exprs := array_append(col_exprs, (n - 1)::text);
    end if;

    if exists (
      select 1
      from information_schema.columns c
      where c.table_schema = 'public'
        and c.table_name = 'load_slots'
        and c.column_name = 'name'
    ) then
      col_names := array_append(col_names, 'name');
      col_exprs := array_append(col_exprs, quote_literal('Load ' || n::text));
    end if;

    if need_driver then
      col_names := array_append(col_names, 'driver_id');
      col_exprs := array_append(col_exprs, quote_literal(drv_id));
    end if;

    if need_unit then
      col_names := array_append(col_names, 'unit_id');
      col_exprs := array_append(col_exprs, quote_literal(unt_id));
    end if;

    for extra in
      select
        c.column_name,
        c.data_type
      from information_schema.columns c
      where c.table_schema = 'public'
        and c.table_name = 'load_slots'
        and c.is_nullable = 'NO'
        and c.column_default is null
        and coalesce(c.is_generated, '') <> 'ALWAYS'
        and c.column_name not in (
          'id',
          'sort_order',
          'slot_index',
          'name',
          'driver_id',
          'unit_id'
        )
    loop
      col_names := array_append(col_names, extra.column_name);
      case
        when extra.data_type in ('text', 'character varying', 'character') then
          if extra.column_name in ('mt', 'rate', 'fsc', 'load_total', 'load_number') then
            col_exprs := array_append(col_exprs, quote_literal('0'));
          else
            col_exprs := array_append(col_exprs, quote_literal(''));
          end if;
        when extra.data_type in ('smallint', 'integer', 'bigint') then
          if extra.column_name in ('mt', 'rate') then
            col_exprs := array_append(col_exprs, '1');
          else
            col_exprs := array_append(col_exprs, '0');
          end if;
        when extra.data_type = 'boolean' then
          col_exprs := array_append(col_exprs, 'false');
        when extra.data_type = 'numeric' then
          if extra.column_name in ('mt', 'rate', 'fsc', 'load_total') then
            col_exprs := array_append(col_exprs, '1');
          else
            col_exprs := array_append(col_exprs, '0');
          end if;
        when extra.data_type = 'double precision' then
          col_exprs := array_append(col_exprs, '0::double precision');
        when extra.data_type = 'real' then
          col_exprs := array_append(col_exprs, '0::real');
        when extra.data_type = 'date' then
          col_exprs := array_append(col_exprs, '''1970-01-01''::date');
        when extra.data_type = 'timestamp with time zone' then
          col_exprs := array_append(col_exprs, '''1970-01-01 00:00:00+00''::timestamptz');
        when extra.data_type = 'timestamp without time zone' then
          col_exprs := array_append(col_exprs, '''1970-01-01 00:00:00''::timestamp');
        when extra.data_type = 'uuid' then
          raise exception
            'load_slots autoseed: column % is uuid NOT NULL without default — insert three rows manually (sort_order 1–3), then re-run.',
            extra.column_name;
        else
          raise exception
            'load_slots autoseed: cannot auto-fill NOT NULL column % (type %) — insert three rows manually.',
            extra.column_name,
            extra.data_type;
      end case;
    end loop;

    sql := format(
      'insert into public.load_slots (%s) values (%s)',
      (
        select string_agg(quote_ident(x), ', ')
        from unnest(col_names) as u(x)
      ),
      (
        select string_agg(x, ', ')
        from unnest(col_exprs) as u(x)
      )
    );

    execute sql;
  end loop;
exception
  when others then
    raise exception
      'load_slots is empty and auto-seed failed (%). Add three rows (sort_order 1–3), then re-run.',
      sqlerrm;
end $$;

-- ── 1) Column without FK first (avoids FK errors during backfill) ──────────
alter table public.schedule_loads
  add column if not exists load_slot_id uuid;

-- ── 2) Backfill only while legacy slot_index still exists ───────────────────
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

-- ── 2b) Fallback: slot_index missing or no match — map by row order per day
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

-- ── 2c) Remove unmappable rows (null load_slot_id after 2 + 2b)
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
      'schedule_loads: removed % unmapped row(s) (extra loads per day vs load_slots count).',
      deleted_count;
  end if;
end $$;

-- ── 2d) Same (week, day, slot) twice — keep lowest id (backfill can double-map)
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
      'schedule_loads: removed % duplicate row(s) (same week_id, load_date, load_slot_id); kept smallest id per group.',
      deduped;
  end if;
end $$;

-- ── 3) Ensure every row has a slot (only if column is still nullable) ───────
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'schedule_loads'
      and column_name = 'load_slot_id'
      and is_nullable = 'YES'
  )
  and exists (
    select 1 from public.schedule_loads where load_slot_id is null
  ) then
    raise exception
      'schedule_loads still has null load_slot_id after cleanup; check triggers or constraints.';
  end if;
end $$;

-- ── 4) NOT NULL + drop legacy slot_index + constraints ──────────────────────
alter table public.schedule_loads
  alter column load_slot_id set not null;

alter table public.schedule_loads
  drop constraint if exists schedule_loads_slot_check;

alter table public.schedule_loads
  drop constraint if exists schedule_loads_week_date_slot_unique;

alter table public.schedule_loads
  drop column if exists slot_index;

-- ── 5) FK to load_slots (drop our name first so re-run is safe) ─────────────
alter table public.schedule_loads
  drop constraint if exists schedule_loads_load_slot_id_fkey;

alter table public.schedule_loads
  add constraint schedule_loads_load_slot_id_fkey
  foreign key (load_slot_id) references public.load_slots (id);

-- ── 6) Unique (week, day, slot) ────────────────────────────────────────────
alter table public.schedule_loads
  drop constraint if exists schedule_loads_week_date_load_slot_uniq;

alter table public.schedule_loads
  add constraint schedule_loads_week_date_load_slot_uniq
  unique (week_id, load_date, load_slot_id);

create index if not exists schedule_loads_load_slot_id_idx on public.schedule_loads (load_slot_id);

-- ── 7) RPC: one load row per load_slots row per day ─────────────────────────
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

do $$
declare
  tbl text := 'load_slots';
begin
  begin
    execute format(
      'alter publication supabase_realtime add table public.%I',
      tbl
    );
  exception
    when duplicate_object then
      null;
    when undefined_table then
      null;
  end;
end $$;
