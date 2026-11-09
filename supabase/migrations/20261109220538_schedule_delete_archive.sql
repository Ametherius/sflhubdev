-- Append-only archive of schedule deletes, so a removed week can be put back.
-- Past deletes are not backfilled. Rows land here only after this migration.

create schema if not exists private;

revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated, service_role;

create table if not exists private.schedule_row_archive (
  id uuid primary key default gen_random_uuid(),
  deleted_at timestamptz not null default now(),
  deleted_by uuid,
  table_name text not null,
  week_id uuid,
  row_id uuid,
  row_data jsonb not null,
  restored_at timestamptz,
  constraint schedule_row_archive_table_name_check check (
    table_name in ('schedule_weeks', 'schedule_assignments', 'schedule_loads')
  )
);

create index if not exists schedule_row_archive_unrestored_idx
  on private.schedule_row_archive (week_id, table_name, deleted_at desc)
  where restored_at is null;

create index if not exists schedule_row_archive_row_idx
  on private.schedule_row_archive (table_name, row_id, deleted_at desc);

alter table private.schedule_row_archive enable row level security;

revoke all on table private.schedule_row_archive from public, anon, authenticated;

create or replace function private.assert_schedule_archive_admin()
returns void
language plpgsql
security definer
set search_path = private, public
as $$
begin
  if auth.uid() is not null then
    if not public.is_admin() then
      raise exception 'Only an admin can read or restore the schedule archive';
    end if;
    return;
  end if;

  if current_user in ('postgres', 'supabase_admin', 'service_role') then
    return;
  end if;

  raise exception 'Only an admin can read or restore the schedule archive';
end;
$$;

create or replace function private.archive_deleted_schedule_row()
returns trigger
language plpgsql
security definer
set search_path = private, public
as $$
declare
  v_week_id uuid;
  v_row jsonb;
begin
  if tg_op is distinct from 'DELETE' then
    raise exception 'archive_deleted_schedule_row is a delete trigger';
  end if;

  -- Read week_id from jsonb so schedule_weeks (no week_id column) still archives.
  v_row := to_jsonb(old);
  if tg_table_name = 'schedule_weeks' then
    v_week_id := old.id;
  else
    v_week_id := nullif(v_row ->> 'week_id', '')::uuid;
  end if;

  insert into private.schedule_row_archive (
    deleted_by,
    table_name,
    week_id,
    row_id,
    row_data
  )
  values (
    auth.uid(),
    tg_table_name,
    v_week_id,
    old.id,
    v_row
  );

  return old;
end;
$$;

drop trigger if exists archive_schedule_weeks_delete on public.schedule_weeks;
create trigger archive_schedule_weeks_delete
  before delete on public.schedule_weeks
  for each row
  execute function private.archive_deleted_schedule_row();

drop trigger if exists archive_schedule_assignments_delete on public.schedule_assignments;
create trigger archive_schedule_assignments_delete
  before delete on public.schedule_assignments
  for each row
  execute function private.archive_deleted_schedule_row();

drop trigger if exists archive_schedule_loads_delete on public.schedule_loads;
create trigger archive_schedule_loads_delete
  before delete on public.schedule_loads
  for each row
  execute function private.archive_deleted_schedule_row();

create or replace function private.jsonb_null_missing_fk(
  p_data jsonb,
  p_key text,
  p_table regclass
)
returns jsonb
language plpgsql
stable
security definer
set search_path = private, public
as $$
declare
  v_id uuid;
  v_exists boolean;
begin
  v_id := nullif(p_data ->> p_key, '')::uuid;
  if v_id is null then
    return p_data;
  end if;

  execute format('select exists (select 1 from %s where id = $1)', p_table)
    into v_exists
    using v_id;

  if v_exists then
    return p_data;
  end if;

  return p_data || jsonb_build_object(p_key, null);
end;
$$;

create or replace function private.restore_archived_schedule_rows(p_archive_ids uuid[])
returns integer
language plpgsql
security definer
set search_path = private, public
as $$
declare
  r record;
  v_data jsonb;
  v_count integer := 0;
begin
  perform private.assert_schedule_archive_admin();

  if p_archive_ids is null or cardinality(p_archive_ids) = 0 then
    raise exception 'No archive rows were selected';
  end if;

  for r in
    select *
    from private.schedule_row_archive
    where id = any (p_archive_ids)
      and restored_at is null
    order by
      case table_name
        when 'schedule_weeks' then 1
        when 'schedule_assignments' then 2
        when 'schedule_loads' then 3
        else 4
      end,
      deleted_at
  loop
    v_data := r.row_data;

    if r.table_name = 'schedule_assignments' then
      v_data := private.jsonb_null_missing_fk(v_data, 'in_use_unit_id', 'public.in_use_units'::regclass);
      v_data := private.jsonb_null_missing_fk(v_data, 'driverid', 'public.drivers'::regclass);
      v_data := private.jsonb_null_missing_fk(v_data, 'unitid', 'public.units'::regclass);

      insert into public.schedule_assignments
      select *
      from jsonb_populate_record(null::public.schedule_assignments, v_data)
      on conflict (id) do nothing;
    elsif r.table_name = 'schedule_loads' then
      v_data := private.jsonb_null_missing_fk(v_data, 'in_use_unit_id', 'public.in_use_units'::regclass);
      v_data := private.jsonb_null_missing_fk(v_data, 'schedule_assignment_id', 'public.schedule_assignments'::regclass);
      v_data := private.jsonb_null_missing_fk(v_data, 'loadsheet_id', 'public.loadsheets'::regclass);

      insert into public.schedule_loads
      select *
      from jsonb_populate_record(null::public.schedule_loads, v_data)
      on conflict (id) do nothing;
    elsif r.table_name = 'schedule_weeks' then
      insert into public.schedule_weeks
      select *
      from jsonb_populate_record(null::public.schedule_weeks, v_data)
      on conflict (id) do nothing;
    else
      raise exception 'Archive row % is for an unexpected table %', r.id, r.table_name;
    end if;

    update private.schedule_row_archive
    set restored_at = now()
    where id = r.id;

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

create or replace function private.restore_schedule_archive_for_driver(
  p_week_id uuid,
  p_driver_name text
)
returns integer
language plpgsql
security definer
set search_path = private, public
as $$
declare
  v_ids uuid[];
begin
  perform private.assert_schedule_archive_admin();

  if p_week_id is null or nullif(trim(p_driver_name), '') is null then
    raise exception 'Week and driver name are required';
  end if;

  with latest as (
    select distinct on (table_name, row_id)
      id,
      table_name,
      row_id,
      row_data
    from private.schedule_row_archive
    where restored_at is null
      and (
        (table_name = 'schedule_weeks' and row_id = p_week_id)
        or (
          table_name = 'schedule_assignments'
          and week_id = p_week_id
          and lower(trim(row_data ->> 'driver_name')) = lower(trim(p_driver_name))
        )
        or (table_name = 'schedule_loads' and week_id = p_week_id)
      )
    order by table_name, row_id, deleted_at desc
  ),
  assignments as (
    select row_id, row_data
    from latest
    where table_name = 'schedule_assignments'
  ),
  picked as (
    select id
    from latest
    where table_name = 'schedule_weeks'
    union
    select l.id
    from latest l
    join assignments a on l.row_id = a.row_id
    where l.table_name = 'schedule_assignments'
    union
    select l.id
    from latest l
    join assignments a
      on l.table_name = 'schedule_loads'
     and (
       nullif(l.row_data ->> 'schedule_assignment_id', '')::uuid = a.row_id
       or (
         nullif(l.row_data ->> 'in_use_unit_id', '') is not null
         and nullif(l.row_data ->> 'in_use_unit_id', '')
           = nullif(a.row_data ->> 'in_use_unit_id', '')
       )
     )
  )
  select coalesce(array_agg(id), '{}')
  into v_ids
  from picked;

  if cardinality(v_ids) = 0 then
    return 0;
  end if;

  return private.restore_archived_schedule_rows(v_ids);
end;
$$;

create or replace function private.list_schedule_row_archive(
  p_week_id uuid default null,
  p_since timestamptz default null
)
returns table (
  id uuid,
  deleted_at timestamptz,
  deleted_by uuid,
  table_name text,
  week_id uuid,
  row_id uuid,
  driver_name text,
  unit_label text,
  load_date date,
  load_number text,
  origin text,
  week_start_date date,
  restored_at timestamptz
)
language plpgsql
security definer
set search_path = private, public
as $$
begin
  perform private.assert_schedule_archive_admin();

  return query
  select
    a.id,
    a.deleted_at,
    a.deleted_by,
    a.table_name,
    a.week_id,
    a.row_id,
    a.row_data ->> 'driver_name',
    a.row_data ->> 'unit_label',
    nullif(a.row_data ->> 'load_date', '')::date,
    a.row_data ->> 'load_number',
    a.row_data ->> 'origin',
    nullif(a.row_data ->> 'week_start_date', '')::date,
    a.restored_at
  from private.schedule_row_archive a
  where (p_week_id is null or a.week_id = p_week_id)
    and (p_since is null or a.deleted_at >= p_since)
  order by a.deleted_at desc, a.table_name, a.row_id;
end;
$$;

create or replace function public.list_schedule_row_archive(
  p_week_id uuid default null,
  p_since timestamptz default null
)
returns table (
  id uuid,
  deleted_at timestamptz,
  deleted_by uuid,
  table_name text,
  week_id uuid,
  row_id uuid,
  driver_name text,
  unit_label text,
  load_date date,
  load_number text,
  origin text,
  week_start_date date,
  restored_at timestamptz
)
language plpgsql
security invoker
set search_path = public
as $$
begin
  return query
  select *
  from private.list_schedule_row_archive(p_week_id, p_since);
end;
$$;

create or replace function public.restore_archived_schedule_rows(p_archive_ids uuid[])
returns integer
language plpgsql
security invoker
set search_path = public
as $$
begin
  return private.restore_archived_schedule_rows(p_archive_ids);
end;
$$;

create or replace function public.restore_schedule_archive_for_driver(
  p_week_id uuid,
  p_driver_name text
)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
begin
  return private.restore_schedule_archive_for_driver(p_week_id, p_driver_name);
end;
$$;

revoke all on function private.assert_schedule_archive_admin() from public, anon, authenticated;
revoke all on function private.archive_deleted_schedule_row() from public, anon;
revoke all on function private.jsonb_null_missing_fk(jsonb, text, regclass) from public, anon, authenticated;
revoke all on function private.restore_archived_schedule_rows(uuid[]) from public, anon;
revoke all on function private.restore_schedule_archive_for_driver(uuid, text) from public, anon;
revoke all on function private.list_schedule_row_archive(uuid, timestamptz) from public, anon;

grant execute on function private.archive_deleted_schedule_row() to authenticated, service_role;
grant execute on function private.assert_schedule_archive_admin() to authenticated, service_role;
grant execute on function private.restore_archived_schedule_rows(uuid[]) to authenticated, service_role;
grant execute on function private.restore_schedule_archive_for_driver(uuid, text) to authenticated, service_role;
grant execute on function private.list_schedule_row_archive(uuid, timestamptz) to authenticated, service_role;

revoke all on function public.list_schedule_row_archive(uuid, timestamptz) from public, anon;
revoke all on function public.restore_archived_schedule_rows(uuid[]) from public, anon;
revoke all on function public.restore_schedule_archive_for_driver(uuid, text) from public, anon;

grant execute on function public.list_schedule_row_archive(uuid, timestamptz) to authenticated, service_role;
grant execute on function public.restore_archived_schedule_rows(uuid[]) to authenticated, service_role;
grant execute on function public.restore_schedule_archive_for_driver(uuid, text) to authenticated, service_role;

notify pgrst, 'reload schema';
