-- Rankings use exactly five geographic levels:
-- world, continent, region, country, and city.
update public.social_accounts
set location_id = 'dubai'
where location_id = 'dubai-emirate';

update public.locations
set parent_id = 'middle-east'
where parent_id = 'gcc';

update public.locations
set parent_id = 'uae'
where parent_id = 'dubai-emirate';

delete from public.locations
where id in ('gcc', 'dubai-emirate');

update public.locations
set type = 'region'
where id = 'middle-east';

alter table public.locations
  drop constraint locations_type_check;

alter table public.locations
  add constraint locations_type_check
  check (type in ('world', 'continent', 'region', 'country', 'city'));
