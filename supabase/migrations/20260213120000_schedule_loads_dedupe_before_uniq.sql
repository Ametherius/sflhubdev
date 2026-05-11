-- Recovery: if link migration failed at schedule_loads_week_date_load_slot_uniq
-- due to duplicate (week_id, load_date, load_slot_id), dedupe then add constraint if missing.

delete from public.schedule_loads a
using public.schedule_loads b
where a.week_id = b.week_id
  and a.load_date = b.load_date
  and a.load_slot_id = b.load_slot_id
  and a.id > b.id;

do $$
begin
  if not exists (
    select 1
    from pg_constraint c
    join pg_class t on c.conrelid = t.oid
    join pg_namespace n on t.relnamespace = n.oid
    where n.nspname = 'public'
      and t.relname = 'schedule_loads'
      and c.conname = 'schedule_loads_week_date_load_slot_uniq'
  ) then
    alter table public.schedule_loads
      add constraint schedule_loads_week_date_load_slot_uniq
      unique (week_id, load_date, load_slot_id);
  end if;
end $$;
