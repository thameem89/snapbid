-- Owner-only Climbr social profiles and ownership verification challenges.
alter table public.social_accounts
  add column if not exists owner_user_id uuid references auth.users(id) on delete restrict;

create unique index if not exists one_owner_per_social_account
  on public.social_account_owners(social_account_id);
create index if not exists social_accounts_owner
  on public.social_accounts(owner_user_id);

-- Legacy profiles remain unassigned and cannot rank or receive promotion until
-- an administrator verifies a real owner.
update public.social_accounts
set account_status = 'pending'
where ownership_status <> 'verified' or owner_user_id is null;

create table if not exists public.social_verification_challenges(
  id uuid primary key default gen_random_uuid(),
  social_account_id uuid not null references public.social_accounts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  verification_method text not null check(verification_method in('public_code','story_post','manual_proof')),
  challenge_code_hash text not null,
  challenge_code_display text not null,
  status text not null default 'pending' check(status in('pending','submitted','verified','rejected','expired')),
  evidence_text text check(evidence_text is null or length(evidence_text) between 10 and 3000),
  expires_at timestamptz not null,
  submitted_at timestamptz,
  verified_at timestamptz,
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz not null default now()
);
create unique index if not exists one_open_social_challenge
  on public.social_verification_challenges(social_account_id,user_id)
  where status in('pending','submitted');
create index if not exists social_challenges_review
  on public.social_verification_challenges(status,created_at);

alter table public.social_verification_challenges enable row level security;
grant select on public.social_verification_challenges to authenticated;
create policy own_social_challenges on public.social_verification_challenges
  for select to authenticated using(user_id=(select auth.uid()));

drop policy if exists approved_accounts on public.social_accounts;
create policy verified_accounts on public.social_accounts for select to anon,authenticated
using(account_status='approved' and ownership_status='verified' and owner_user_id is not null);

create or replace function public.validate_purchase_account() returns trigger language plpgsql security definer set search_path='' as $$
begin
  if new.payer_user_id is null then raise exception 'Sign in required'; end if;
  perform 1 from public.social_accounts a join public.platforms p on p.id=a.platform_id
  where a.id=new.social_account_id and a.account_status='approved'
    and a.ownership_status='verified' and a.owner_user_id=new.payer_user_id and p.enabled
  for update of a;
  if not found then raise exception 'Verified profile ownership required'; end if;
  return new;
end $$;

create or replace function public.leaderboard(p_location text default 'world',p_platform text default 'snapchat',p_limit integer default 50,p_after integer default 0,p_search text default '') returns jsonb language sql stable set search_path='' as $$
with ranked as(select a.*,l.name as city,coalesce((select x.name from public.location_ancestors(a.location_id) x join public.locations z on z.id=x.id where z.type='country' limit 1),'') as country,row_number() over(order by a.total_verified_promotion_cents desc,a.first_verified_promotion_at asc nulls last,a.id) as rank from public.social_accounts a join public.locations l on l.id=a.location_id where a.account_status='approved' and a.ownership_status='verified' and a.owner_user_id is not null and a.platform_id=p_platform and a.location_id in(select id from public.location_descendants(p_location))), filtered as(select * from ranked where rank>greatest(p_after,0) and (p_search='' or display_name ilike '%'||left(p_search,80)||'%' or normalized_username ilike '%'||left(p_search,80)||'%' or city ilike '%'||left(p_search,80)||'%' or country ilike '%'||left(p_search,80)||'%') order by rank limit least(greatest(p_limit,1),100)) select coalesce(jsonb_agg(to_jsonb(filtered)),'[]'::jsonb) from filtered;
$$;
