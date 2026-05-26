-- Per schedule cell: KMs and invoiced are independent when the same loadsheet is reused.
alter table public.schedule_loads
  add column if not exists kms text,
  add column if not exists invoiced boolean not null default false;

-- One-time copy from linked loadsheet so existing slots keep current KMs/invoiced.
update public.schedule_loads sl
set
  kms = ls.kms,
  invoiced = coalesce(ls.invoiced, false)
from public.loadsheets ls
where sl.loadsheet_id = ls.id;

notify pgrst, 'reload schema';
