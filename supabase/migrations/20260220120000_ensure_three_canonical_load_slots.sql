-- Option 1: three fixed canonical load slots (sort_order 1, 2, 3).
-- Matches ensure_schedule_loads_for_week (first three load_slots by sort_order, limit 3).
-- Re-run safe: only inserts missing sort_order values.
--
-- Inserts (id, sort_order) and optionally name when that column exists.
-- If other NOT NULL columns block insert, use supabase/scripts/insert_three_load_slots_manual.sql.

do $$
declare
  has_name boolean;
begin
  if not exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'load_slots'
  ) then
    raise notice 'ensure_three_canonical_load_slots: public.load_slots missing — skip.';
    return;
  end if;

  select exists (
    select 1
    from information_schema.columns c
    where c.table_schema = 'public'
      and c.table_name = 'load_slots'
      and c.column_name = 'name'
  ) into has_name;

  if has_name then
    insert into public.load_slots (id, sort_order, name)
    select gen_random_uuid(), g.n, 'Load ' || g.n::text
    from generate_series(1, 3) as g(n)
    where not exists (
      select 1 from public.load_slots ls where ls.sort_order = g.n
    );
  else
    insert into public.load_slots (id, sort_order)
    select gen_random_uuid(), g.n
    from generate_series(1, 3) as g(n)
    where not exists (
      select 1 from public.load_slots ls where ls.sort_order = g.n
    );
  end if;
end $$;

notify pgrst, 'reload schema';
