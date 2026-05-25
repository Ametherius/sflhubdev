alter table public.loadsheets
  add column if not exists load_category text;

alter table public.loadsheets
  add column if not exists usd_cad_rate text;
