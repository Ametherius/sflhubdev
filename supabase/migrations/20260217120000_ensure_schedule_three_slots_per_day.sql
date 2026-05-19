-- Schedule at most three load_slots per day per in_use_unit (7 days × 3 loads).

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

  insert into public.schedule_loads (week_id, load_date, load_slot_id, in_use_unit_id)
  select
    p_week_id,
    (ws + d.day_offset)::date,
    ls.id,
    iu.id
  from public.in_use_units iu
  cross join lateral unnest(array[0, 1, 2, 3, 4, 5, 6]) as d(day_offset)
  cross join lateral (
    select id
    from public.load_slots
    order by sort_order nulls last, id
    limit 3
  ) ls
  on conflict (week_id, load_date, load_slot_id, in_use_unit_id) do nothing;
end;
$$;

grant execute on function public.ensure_schedule_loads_for_week (uuid) to authenticated;

notify pgrst, 'reload schema';
