-- Keep stable major-city identifiers when the generated capital catalog contains
-- the same city for the same country.
update public.social_accounts as account
set location_id = stable.id
from public.locations as duplicate
join public.locations as stable
  on stable.type = 'city'
 and stable.parent_id = duplicate.parent_id
 and lower(stable.name) = lower(duplicate.name)
 and stable.id not like 'city-%'
where duplicate.type = 'city'
  and duplicate.id like 'city-%'
  and account.location_id = duplicate.id;

delete from public.locations as duplicate
where duplicate.type = 'city'
  and duplicate.id like 'city-%'
  and exists (
    select 1
    from public.locations as stable
    where stable.type = 'city'
      and stable.parent_id = duplicate.parent_id
      and lower(stable.name) = lower(duplicate.name)
      and stable.id not like 'city-%'
  );
