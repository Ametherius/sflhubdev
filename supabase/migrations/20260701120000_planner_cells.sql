-- Grain load planner: one cell per (week, broker, planner_slot).

create table if not exists public.brokers (
  id uuid primary key default gen_random_uuid(),
  name text not null
);

create table if not exists public.planner_slots (
  id uuid primary key default gen_random_uuid(),
  sort_order smallint,
  name text,
  label text
);

create table if not exists public.planner_cells (
  id uuid primary key default gen_random_uuid(),
  week_id uuid not null references public.schedule_weeks (id) on delete cascade,
  broker_id uuid not null references public.brokers (id) on delete cascade,
  planner_slot_id uuid not null references public.planner_slots (id) on delete restrict,
  note text,
  constraint planner_cells_week_broker_slot_unique unique (week_id, broker_id, planner_slot_id)
);

create index if not exists planner_cells_week_id_idx on public.planner_cells (week_id);

create or replace function public.ensure_planner_cells_for_week (p_week_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.schedule_weeks
    where id = p_week_id
  ) then
    return;
  end if;

  insert into public.planner_cells (week_id, broker_id, planner_slot_id)
  select
    p_week_id,
    b.id,
    ps.id
  from public.brokers b
  cross join public.planner_slots ps
  on conflict (week_id, broker_id, planner_slot_id) do nothing;
end;
$$;

grant execute on function public.ensure_planner_cells_for_week (uuid) to authenticated;

do $$
declare
  r record;
begin
  for r in select id from public.schedule_weeks
  loop
    perform public.ensure_planner_cells_for_week (r.id);
  end loop;
end $$;

-- Required by admin RLS below (normally created in profiles_admin_rls).
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

-- ── brokers ───────────────────────────────────────────────────────────────────
alter table public.brokers enable row level security;

drop policy if exists brokers_authenticated_all on public.brokers;
drop policy if exists "brokers_authenticated_all" on public.brokers;
drop policy if exists brokers_select on public.brokers;
drop policy if exists brokers_insert on public.brokers;
drop policy if exists brokers_update on public.brokers;
drop policy if exists brokers_delete on public.brokers;

create policy brokers_select
  on public.brokers for select to authenticated using (true);

create policy brokers_insert
  on public.brokers for insert to authenticated with check (public.is_admin());

create policy brokers_update
  on public.brokers for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy brokers_delete
  on public.brokers for delete to authenticated using (public.is_admin());

grant select, insert, update, delete on public.brokers to authenticated;

-- ── planner_slots ─────────────────────────────────────────────────────────────
alter table public.planner_slots enable row level security;

drop policy if exists planner_slots_authenticated_all on public.planner_slots;
drop policy if exists "planner_slots_authenticated_all" on public.planner_slots;
drop policy if exists planner_slots_select on public.planner_slots;
drop policy if exists planner_slots_insert on public.planner_slots;
drop policy if exists planner_slots_update on public.planner_slots;
drop policy if exists planner_slots_delete on public.planner_slots;

create policy planner_slots_select
  on public.planner_slots for select to authenticated using (true);

create policy planner_slots_insert
  on public.planner_slots for insert to authenticated with check (public.is_admin());

create policy planner_slots_update
  on public.planner_slots for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy planner_slots_delete
  on public.planner_slots for delete to authenticated using (public.is_admin());

grant select, insert, update, delete on public.planner_slots to authenticated;

-- ── planner_cells ─────────────────────────────────────────────────────────────
alter table public.planner_cells enable row level security;

drop policy if exists planner_cells_authenticated_all on public.planner_cells;
drop policy if exists "planner_cells_authenticated_all" on public.planner_cells;
drop policy if exists planner_cells_select on public.planner_cells;
drop policy if exists planner_cells_insert on public.planner_cells;
drop policy if exists planner_cells_update on public.planner_cells;
drop policy if exists planner_cells_delete on public.planner_cells;

create policy planner_cells_select
  on public.planner_cells for select to authenticated using (true);

create policy planner_cells_insert
  on public.planner_cells for insert to authenticated with check (public.is_admin());

create policy planner_cells_update
  on public.planner_cells for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy planner_cells_delete
  on public.planner_cells for delete to authenticated using (public.is_admin());

grant select, insert, update, delete on public.planner_cells to authenticated;

do $$
begin
  begin
    execute 'alter publication supabase_realtime add table public.planner_cells';
  exception
    when duplicate_object then
      null;
    when undefined_table then
      null;
  end;
end $$;

notify pgrst, 'reload schema';
