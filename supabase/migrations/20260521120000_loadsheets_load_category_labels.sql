-- Store human-readable load types (not snake_case slugs).

update public.loadsheets
set load_category = 'Canadian Grain'
where load_category is null
   or trim(load_category) = ''
   or lower(replace(trim(load_category), ' ', '_')) in ('canadian_grain', 'canadian');

update public.loadsheets
set load_category = 'US Grain'
where lower(replace(trim(load_category), ' ', '_')) in ('us_grain', 'us');

update public.loadsheets
set load_category = 'Chicken'
where lower(replace(trim(load_category), ' ', '_')) = 'chicken';

update public.loadsheets
set load_category = 'Cattle'
where lower(replace(trim(load_category), ' ', '_')) = 'cattle';

update public.loadsheets
set load_category = 'Tanker'
where lower(replace(trim(load_category), ' ', '_')) = 'tanker';
