-- Broadcast row changes to Supabase Realtime (postgres_changes).
-- Safe to re-run: skips tables already in the publication or missing from the DB.
do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'drivers',
    'units',
    'in_use_units',
    'schedule_weeks',
    'schedule_loads'
  ]
  loop
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
  end loop;
end $$;
