-- Reusable load definitions (load sheets) and link from schedule cells.
-- Matches manual loadsheets tables: includes broker; no created_at.

create table if not exists public.loadsheets (
  id uuid primary key default gen_random_uuid(),
  load_number text not null,
  origin text,
  end_user text,
  mt text,
  rate text,
  fsc text,
  broker text
);

alter table public.loadsheets
  add column if not exists load_number text,
  add column if not exists origin text,
  add column if not exists end_user text,
  add column if not exists mt text,
  add column if not exists rate text,
  add column if not exists fsc text,
  add column if not exists broker text;

create index if not exists loadsheets_load_number_idx on public.loadsheets (load_number);

alter table public.schedule_loads
  add column if not exists loadsheet_id uuid references public.loadsheets (id) on delete set null,
  add column if not exists load_number text,
  add column if not exists fsc text;

create index if not exists schedule_loads_loadsheet_id_idx on public.schedule_loads (loadsheet_id);

alter table public.loadsheets enable row level security;

drop policy if exists "loadsheets_authenticated_all" on public.loadsheets;

create policy "loadsheets_authenticated_all"
  on public.loadsheets
  for all
  to authenticated
  using (true)
  with check (true);

grant select, insert, update, delete on public.loadsheets to authenticated;

do $$
begin
  begin
    execute 'alter publication supabase_realtime add table public.loadsheets';
  exception
    when duplicate_object then
      null;
    when undefined_table then
      null;
  end;
end $$;

notify pgrst, 'reload schema';
