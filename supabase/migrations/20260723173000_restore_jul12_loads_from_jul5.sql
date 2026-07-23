-- Best-effort: copy Jul 5 load details onto Jul 12 slots for restored Canadian Grain trucks.
-- Original Jul 12 load rows were hard-deleted and are not recoverable.

update public.schedule_loads as dst
set
  loadsheet_id = src.loadsheet_id,
  load_number = src.load_number,
  fsc = src.fsc,
  load_note = src.load_note,
  origin = src.origin,
  end_user = src.end_user,
  mt = src.mt,
  rate = src.rate,
  load_total = src.load_total,
  kms = src.kms,
  invoiced = src.invoiced,
  load_category = src.load_category,
  usd_cad_rate = src.usd_cad_rate
from public.schedule_loads as src
join public.schedule_assignments sa_src
  on sa_src.id = src.schedule_assignment_id
join public.schedule_weeks sw_src
  on sw_src.id = src.week_id
join public.schedule_assignments sa_dst
  on sa_dst.in_use_unit_id = sa_src.in_use_unit_id
join public.schedule_weeks sw_dst
  on sw_dst.id = sa_dst.week_id
where sw_src.week_start_date = '2026-07-05'
  and sw_dst.week_start_date = '2026-07-12'
  and dst.schedule_assignment_id = sa_dst.id
  and dst.load_slot_id = src.load_slot_id
  and dst.load_date = (src.load_date + 7)
  and sa_dst.driver_name in (
    'Ajay Chhabra - H74',
    'Brett Mckee',
    'Chad Benoit - H81',
    'Fred Moerkerk - GT24',
    'Gavin Pineau - GT21',
    'Jason Little - H81',
    'Martin Harder - H73',
    'Randall Hodgins - H79',
    'Shawn Packer - GT22',
    'Stephen Prieur',
    'Wayne Soles - H72',
    'Yurii Lakiichuk/U75 Th&Fri - H76',
    'Zach Lyons - H69'
  )
  and (
    nullif(trim(coalesce(src.origin, '')), '') is not null
    or nullif(trim(coalesce(src.end_user, '')), '') is not null
    or nullif(trim(coalesce(src.load_number, '')), '') is not null
    or nullif(trim(coalesce(src.load_total, '')), '') is not null
    or src.loadsheet_id is not null
  );

notify pgrst, 'reload schema';
