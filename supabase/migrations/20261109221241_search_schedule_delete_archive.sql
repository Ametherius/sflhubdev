-- Admin search of unrestored schedule deletes for the schedule page.

create or replace function private.search_schedule_delete_archive(p_query text)
returns table (
  week_id uuid,
  week_start_date date,
  driver_name text,
  unit_label text,
  deleted_at timestamptz,
  load_count integer,
  load_numbers text
)
language plpgsql
security definer
set search_path = private, public
as $$
declare
  v_raw text := nullif(trim(p_query), '');
  v_like text;
begin
  perform private.assert_schedule_archive_admin();

  if v_raw is not null then
    v_like :=
      '%'
      || replace(replace(replace(v_raw, '\', '\\'), '%', '\%'), '_', '\_')
      || '%';
  end if;

  return query
  with assignments as (
    select distinct on (
      a.week_id,
      lower(trim(coalesce(a.row_data ->> 'driver_name', ''))),
      lower(trim(coalesce(a.row_data ->> 'unit_label', '')))
    )
      a.week_id,
      a.deleted_at,
      a.row_id,
      a.row_data
    from private.schedule_row_archive a
    where a.restored_at is null
      and a.table_name = 'schedule_assignments'
      and nullif(trim(a.row_data ->> 'driver_name'), '') is not null
      and (
        v_like is null
        or a.row_data ->> 'driver_name' ilike v_like escape '\'
        or coalesce(a.row_data ->> 'unit_label', '') ilike v_like escape '\'
      )
    order by
      a.week_id,
      lower(trim(coalesce(a.row_data ->> 'driver_name', ''))),
      lower(trim(coalesce(a.row_data ->> 'unit_label', ''))),
      a.deleted_at desc
  ),
  loads as (
    select distinct on (l.row_id)
      l.row_id,
      l.week_id,
      l.row_data
    from private.schedule_row_archive l
    where l.restored_at is null
      and l.table_name = 'schedule_loads'
    order by l.row_id, l.deleted_at desc
  )
  select
    s.week_id,
    coalesce(
      sw.week_start_date,
      (
        select nullif(w.row_data ->> 'week_start_date', '')::date
        from private.schedule_row_archive w
        where w.table_name = 'schedule_weeks'
          and w.row_id = s.week_id
        order by w.deleted_at desc
        limit 1
      )
    ) as week_start_date,
    s.row_data ->> 'driver_name' as driver_name,
    nullif(trim(s.row_data ->> 'unit_label'), '') as unit_label,
    s.deleted_at,
    (
      select count(*)::integer
      from loads l
      where l.week_id = s.week_id
        and (
          nullif(l.row_data ->> 'schedule_assignment_id', '')::uuid = s.row_id
          or (
            nullif(l.row_data ->> 'in_use_unit_id', '') is not null
            and nullif(l.row_data ->> 'in_use_unit_id', '')
              = nullif(s.row_data ->> 'in_use_unit_id', '')
          )
        )
        and (
          nullif(trim(l.row_data ->> 'load_number'), '') is not null
          or nullif(trim(l.row_data ->> 'origin'), '') is not null
          or nullif(l.row_data ->> 'loadsheet_id', '') is not null
        )
    ) as load_count,
    (
      select string_agg(nums.n, ', ' order by nums.n)
      from (
        select distinct nullif(trim(l.row_data ->> 'load_number'), '') as n
        from loads l
        where l.week_id = s.week_id
          and (
            nullif(l.row_data ->> 'schedule_assignment_id', '')::uuid = s.row_id
            or (
              nullif(l.row_data ->> 'in_use_unit_id', '') is not null
              and nullif(l.row_data ->> 'in_use_unit_id', '')
                = nullif(s.row_data ->> 'in_use_unit_id', '')
            )
          )
      ) nums
      where nums.n is not null
    ) as load_numbers
  from assignments s
  left join public.schedule_weeks sw on sw.id = s.week_id
  order by s.deleted_at desc
  limit 40;
end;
$$;

create or replace function public.search_schedule_delete_archive(p_query text)
returns table (
  week_id uuid,
  week_start_date date,
  driver_name text,
  unit_label text,
  deleted_at timestamptz,
  load_count integer,
  load_numbers text
)
language plpgsql
security invoker
set search_path = public
as $$
begin
  return query
  select *
  from private.search_schedule_delete_archive(p_query);
end;
$$;

revoke all on function private.search_schedule_delete_archive(text) from public, anon;
grant execute on function private.search_schedule_delete_archive(text) to authenticated, service_role;

revoke all on function public.search_schedule_delete_archive(text) from public, anon;
grant execute on function public.search_schedule_delete_archive(text) to authenticated, service_role;

notify pgrst, 'reload schema';
