-- Per-week broker visibility on the load planner (hide without deleting).
create table if not exists public.planner_week_broker_hides (
  week_id uuid not null references public.schedule_weeks (id) on delete cascade,
  broker_id uuid not null references public.brokers (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (week_id, broker_id)
);

create index if not exists planner_week_broker_hides_week_id_idx
  on public.planner_week_broker_hides (week_id);

alter table public.planner_week_broker_hides enable row level security;

drop policy if exists planner_week_broker_hides_select on public.planner_week_broker_hides;
drop policy if exists planner_week_broker_hides_insert on public.planner_week_broker_hides;
drop policy if exists planner_week_broker_hides_delete on public.planner_week_broker_hides;

create policy planner_week_broker_hides_select
  on public.planner_week_broker_hides for select to authenticated using (true);

create policy planner_week_broker_hides_insert
  on public.planner_week_broker_hides for insert to authenticated
  with check (public.is_admin());

create policy planner_week_broker_hides_delete
  on public.planner_week_broker_hides for delete to authenticated
  using (public.is_admin());

grant select, insert, delete on public.planner_week_broker_hides to authenticated;
