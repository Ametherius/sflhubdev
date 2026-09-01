-- Load sheet library + invoiced flag; schedule_loads detail columns used by the app.

create table if not exists public.loadsheets (
  id uuid primary key default gen_random_uuid(),
  load_number text not null,
  origin text,
  end_user text,
  mt text,
  rate text,
  fsc text,
  broker text,
  invoiced boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.loadsheets
  add column if not exists invoiced boolean not null default false;

alter table public.schedule_loads
  add column if not exists loadsheet_id uuid references public.loadsheets (id) on delete set null;

alter table public.schedule_loads
  add column if not exists load_number text;

alter table public.schedule_loads
  add column if not exists load_note text;

alter table public.schedule_loads
  add column if not exists origin text;

alter table public.schedule_loads
  add column if not exists end_user text;

alter table public.schedule_loads
  add column if not exists mt text;

alter table public.schedule_loads
  add column if not exists rate text;

alter table public.schedule_loads
  add column if not exists fsc text;

alter table public.schedule_loads
  add column if not exists load_total text;

create index if not exists schedule_loads_loadsheet_id_idx
  on public.schedule_loads (loadsheet_id);

alter table public.loadsheets enable row level security;

drop policy if exists loadsheets_authenticated_all on public.loadsheets;
create policy loadsheets_authenticated_all
  on public.loadsheets
  for all
  to authenticated
  using (true)
  with check (true);

grant select, insert, update, delete on public.loadsheets to authenticated;

do $$
declare
  tbl text := 'loadsheets';
begin
  begin
    execute format(
      'alter publication supabase_realtime add table public.%I',
      tbl
    );
  exception
    when duplicate_object then
      null;
    when undefined_table then
      null;
  end;
end $$;
