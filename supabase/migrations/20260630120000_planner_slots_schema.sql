-- Align planner_slots with the app (broker_id, week_id, plan_date, sort_order, origin, end_user).
-- If Supabase linked brokers as column "brokers", rename to broker_id.

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

do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'planner_slots'
  ) then
    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public'
        and table_name = 'planner_slots'
        and column_name = 'brokers'
    ) and not exists (
      select 1 from information_schema.columns
      where table_schema = 'public'
        and table_name = 'planner_slots'
        and column_name = 'broker_id'
    ) then
      execute 'alter table public.planner_slots rename column brokers to broker_id';
    end if;

    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public'
        and table_name = 'planner_slots'
        and column_name = 'schedule_weeks'
    ) and not exists (
      select 1 from information_schema.columns
      where table_schema = 'public'
        and table_name = 'planner_slots'
        and column_name = 'week_id'
    ) then
      execute 'alter table public.planner_slots rename column schedule_weeks to week_id';
    end if;
  end if;
end $$;

create table if not exists public.planner_slots (
  id uuid primary key default gen_random_uuid(),
  broker_id uuid not null references public.brokers (id) on delete cascade,
  week_id uuid not null references public.schedule_weeks (id) on delete cascade,
  plan_date date not null,
  sort_order integer not null default 1,
  origin text,
  end_user text,
  created_at timestamptz not null default now()
);

alter table public.planner_slots
  add column if not exists broker_id uuid,
  add column if not exists week_id uuid,
  add column if not exists plan_date date,
  add column if not exists sort_order integer not null default 1,
  add column if not exists origin text,
  add column if not exists end_user text,
  add column if not exists created_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'planner_slots_broker_id_fkey'
      and conrelid = 'public.planner_slots'::regclass
  ) then
    alter table public.planner_slots
      add constraint planner_slots_broker_id_fkey
      foreign key (broker_id) references public.brokers (id) on delete cascade;
  end if;
exception
  when others then
    raise notice 'planner_slots_broker_id_fkey: %', sqlerrm;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'planner_slots_week_id_fkey'
      and conrelid = 'public.planner_slots'::regclass
  ) then
    alter table public.planner_slots
      add constraint planner_slots_week_id_fkey
      foreign key (week_id) references public.schedule_weeks (id) on delete cascade;
  end if;
exception
  when others then
    raise notice 'planner_slots_week_id_fkey: %', sqlerrm;
end $$;

alter table public.planner_slots enable row level security;

drop policy if exists planner_slots_select on public.planner_slots;
drop policy if exists planner_slots_insert on public.planner_slots;
drop policy if exists planner_slots_update on public.planner_slots;
drop policy if exists planner_slots_delete on public.planner_slots;

create policy planner_slots_select
  on public.planner_slots for select to authenticated using (true);

create policy planner_slots_insert
  on public.planner_slots for insert to authenticated
  with check (public.is_admin());

create policy planner_slots_update
  on public.planner_slots for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy planner_slots_delete
  on public.planner_slots for delete to authenticated using (public.is_admin());

grant select, insert, update, delete on public.planner_slots to authenticated;

notify pgrst, 'reload schema';
