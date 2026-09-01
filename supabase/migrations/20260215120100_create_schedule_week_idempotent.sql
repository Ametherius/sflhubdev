-- Return existing week id when week_start_date already exists (avoids orphan client week ids).
create or replace function public.create_schedule_week (p_week_start date)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_week_id uuid;
begin
  insert into public.schedule_weeks (week_start_date)
  values (p_week_start)
  on conflict (week_start_date) do nothing;

  select id into v_week_id
  from public.schedule_weeks
  where week_start_date = p_week_start;

  return v_week_id;
end;
$$;

grant execute on function public.create_schedule_week (date) to authenticated;
