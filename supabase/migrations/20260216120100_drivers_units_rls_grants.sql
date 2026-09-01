-- drivers / units / in_use_units: authenticated CRUD (matches schedule_* policies).
-- Fixes "edit info" on live when RLS was enabled without update policies.

alter table if exists public.drivers enable row level security;
alter table if exists public.units enable row level security;
alter table if exists public.in_use_units enable row level security;

drop policy if exists drivers_authenticated_all on public.drivers;
create policy drivers_authenticated_all
  on public.drivers
  for all
  to authenticated
  using (true)
  with check (true);

drop policy if exists units_authenticated_all on public.units;
create policy units_authenticated_all
  on public.units
  for all
  to authenticated
  using (true)
  with check (true);

drop policy if exists in_use_units_authenticated_all on public.in_use_units;
create policy in_use_units_authenticated_all
  on public.in_use_units
  for all
  to authenticated
  using (true)
  with check (true);

grant select, insert, update, delete on public.drivers to authenticated;
grant select, insert, update, delete on public.units to authenticated;
grant select, insert, update, delete on public.in_use_units to authenticated;
