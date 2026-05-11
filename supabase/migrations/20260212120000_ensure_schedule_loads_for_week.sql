-- Fills missing schedule_loads rows for every day of the week × every load_slot
-- (idempotent). Used when at least one unit is in use so the UI always has 7 full days.
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

  insert into public.schedule_loads (week_id, load_date, load_slot_id)
  select
    p_week_id,
    (ws + day_offset)::date,
    ls.id
  from unnest(array[0, 1, 2, 3, 4, 5, 6]) as day_offset
  cross join lateral (
    select id
    from public.load_slots
    order by sort_order, id
  ) ls
  on conflict (week_id, load_date, load_slot_id) do nothing;
end;
$$;

grant execute on function public.ensure_schedule_loads_for_week (uuid) to authenticated;
