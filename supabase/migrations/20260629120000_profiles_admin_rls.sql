-- profiles.admin: read-only users can SELECT; only admins can INSERT/UPDATE/DELETE app data.
-- Apply after adding profiles.admin (boolean, default false) in Supabase.

alter table if exists public.profiles
  add column if not exists admin boolean not null default false;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select p.admin
      from public.profiles p
      where p.id = auth.uid()
    ),
    false
  );
$$;

grant execute on function public.is_admin() to authenticated;

alter table if exists public.profiles enable row level security;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own
  on public.profiles
  for select
  to authenticated
  using (id = auth.uid());

drop policy if exists profiles_update_admin on public.profiles;
create policy profiles_update_admin
  on public.profiles
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant select on public.profiles to authenticated;
grant update on public.profiles to authenticated;

-- ── schedule_weeks ──────────────────────────────────────────────────────────
alter table if exists public.schedule_weeks enable row level security;

drop policy if exists schedule_weeks_authenticated_all on public.schedule_weeks;
drop policy if exists "schedule_weeks_authenticated_all" on public.schedule_weeks;
drop policy if exists schedule_weeks_select on public.schedule_weeks;
drop policy if exists schedule_weeks_insert on public.schedule_weeks;
drop policy if exists schedule_weeks_update on public.schedule_weeks;
drop policy if exists schedule_weeks_delete on public.schedule_weeks;

create policy schedule_weeks_select
  on public.schedule_weeks for select to authenticated using (true);
create policy schedule_weeks_insert
  on public.schedule_weeks for insert to authenticated with check (public.is_admin());
create policy schedule_weeks_update
  on public.schedule_weeks for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy schedule_weeks_delete
  on public.schedule_weeks for delete to authenticated using (public.is_admin());

-- ── schedule_loads ────────────────────────────────────────────────────────────
alter table if exists public.schedule_loads enable row level security;

drop policy if exists schedule_loads_authenticated_all on public.schedule_loads;
drop policy if exists "schedule_loads_authenticated_all" on public.schedule_loads;
drop policy if exists schedule_loads_select on public.schedule_loads;
drop policy if exists schedule_loads_insert on public.schedule_loads;
drop policy if exists schedule_loads_update on public.schedule_loads;
drop policy if exists schedule_loads_delete on public.schedule_loads;

create policy schedule_loads_select
  on public.schedule_loads for select to authenticated using (true);
create policy schedule_loads_insert
  on public.schedule_loads for insert to authenticated with check (public.is_admin());
create policy schedule_loads_update
  on public.schedule_loads for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy schedule_loads_delete
  on public.schedule_loads for delete to authenticated using (public.is_admin());

-- ── schedule_assignments ──────────────────────────────────────────────────────
alter table if exists public.schedule_assignments enable row level security;

drop policy if exists schedule_assignments_authenticated_all on public.schedule_assignments;
drop policy if exists schedule_assignments_select on public.schedule_assignments;
drop policy if exists schedule_assignments_insert on public.schedule_assignments;
drop policy if exists schedule_assignments_update on public.schedule_assignments;
drop policy if exists schedule_assignments_delete on public.schedule_assignments;

create policy schedule_assignments_select
  on public.schedule_assignments for select to authenticated using (true);
create policy schedule_assignments_insert
  on public.schedule_assignments for insert to authenticated with check (public.is_admin());
create policy schedule_assignments_update
  on public.schedule_assignments for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy schedule_assignments_delete
  on public.schedule_assignments for delete to authenticated using (public.is_admin());

-- ── loadsheets ────────────────────────────────────────────────────────────────
alter table if exists public.loadsheets enable row level security;

drop policy if exists loadsheets_authenticated_all on public.loadsheets;
drop policy if exists "loadsheets_authenticated_all" on public.loadsheets;
drop policy if exists loadsheets_select on public.loadsheets;
drop policy if exists loadsheets_insert on public.loadsheets;
drop policy if exists loadsheets_update on public.loadsheets;
drop policy if exists loadsheets_delete on public.loadsheets;

create policy loadsheets_select
  on public.loadsheets for select to authenticated using (true);
create policy loadsheets_insert
  on public.loadsheets for insert to authenticated with check (public.is_admin());
create policy loadsheets_update
  on public.loadsheets for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy loadsheets_delete
  on public.loadsheets for delete to authenticated using (public.is_admin());

-- ── drivers ───────────────────────────────────────────────────────────────────
alter table if exists public.drivers enable row level security;

drop policy if exists drivers_authenticated_all on public.drivers;
drop policy if exists drivers_select on public.drivers;
drop policy if exists drivers_insert on public.drivers;
drop policy if exists drivers_update on public.drivers;
drop policy if exists drivers_delete on public.drivers;

create policy drivers_select
  on public.drivers for select to authenticated using (true);
create policy drivers_insert
  on public.drivers for insert to authenticated with check (public.is_admin());
create policy drivers_update
  on public.drivers for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy drivers_delete
  on public.drivers for delete to authenticated using (public.is_admin());

-- ── units ─────────────────────────────────────────────────────────────────────
alter table if exists public.units enable row level security;

drop policy if exists units_authenticated_all on public.units;
drop policy if exists units_select on public.units;
drop policy if exists units_insert on public.units;
drop policy if exists units_update on public.units;
drop policy if exists units_delete on public.units;

create policy units_select
  on public.units for select to authenticated using (true);
create policy units_insert
  on public.units for insert to authenticated with check (public.is_admin());
create policy units_update
  on public.units for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy units_delete
  on public.units for delete to authenticated using (public.is_admin());

-- ── in_use_units ──────────────────────────────────────────────────────────────
alter table if exists public.in_use_units enable row level security;

drop policy if exists in_use_units_authenticated_all on public.in_use_units;
drop policy if exists in_use_units_select on public.in_use_units;
drop policy if exists in_use_units_insert on public.in_use_units;
drop policy if exists in_use_units_update on public.in_use_units;
drop policy if exists in_use_units_delete on public.in_use_units;

create policy in_use_units_select
  on public.in_use_units for select to authenticated using (true);
create policy in_use_units_insert
  on public.in_use_units for insert to authenticated with check (public.is_admin());
create policy in_use_units_update
  on public.in_use_units for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy in_use_units_delete
  on public.in_use_units for delete to authenticated using (public.is_admin());

-- ── load_slots (read-only for non-admins) ─────────────────────────────────────
do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'load_slots'
  ) then
    execute 'alter table public.load_slots enable row level security';

    execute 'drop policy if exists load_slots_authenticated_all on public.load_slots';
    execute 'drop policy if exists load_slots_select on public.load_slots';
    execute 'drop policy if exists load_slots_insert on public.load_slots';
    execute 'drop policy if exists load_slots_update on public.load_slots';
    execute 'drop policy if exists load_slots_delete on public.load_slots';

    execute $p$
      create policy load_slots_select
        on public.load_slots for select to authenticated using (true)
    $p$;
    execute $p$
      create policy load_slots_insert
        on public.load_slots for insert to authenticated with check (public.is_admin())
    $p$;
    execute $p$
      create policy load_slots_update
        on public.load_slots for update to authenticated
        using (public.is_admin()) with check (public.is_admin())
    $p$;
    execute $p$
      create policy load_slots_delete
        on public.load_slots for delete to authenticated using (public.is_admin())
    $p$;
  end if;
end $$;
