create extension if not exists pg_trgm;
-- All money is integer USD cents. Only service_role can write ranking value.
create table public.platforms(id text primary key,name text not null,profile_url_pattern text not null,enabled boolean not null default false);
create table public.locations(id text primary key,name text not null,slug text not null unique,type text not null check(type in('world','continent','subregion','country','region','city')),parent_id text references public.locations(id),country_code text,continent_code text,enabled boolean not null default true,created_at timestamptz not null default now(),check(id<>parent_id));
create index locations_parent on public.locations(parent_id);
create table public.profiles(id uuid primary key references auth.users(id) on delete cascade,display_name text,created_at timestamptz not null default now());
create table public.admin_members(user_id uuid primary key references auth.users(id) on delete cascade);
create table public.social_accounts(id uuid primary key default gen_random_uuid(),platform_id text not null references public.platforms(id),username text not null,normalized_username text generated always as(lower(trim(both '@' from btrim(username)))) stored,display_name text not null check(length(display_name) between 1 and 80),slug text not null unique,profile_url text not null,avatar_url text,bio text not null default '' check(length(bio)<=500),location_id text not null references public.locations(id),location_verification_status text not null default 'declared' check(location_verification_status in('declared','verified','disputed')),ownership_status text not null default 'unclaimed' check(ownership_status in('unclaimed','claim_pending','verified','rejected','suspended')),account_status text not null default 'pending' check(account_status in('pending','approved','suspended','rejected')),total_verified_promotion_cents bigint not null default 0 check(total_verified_promotion_cents between 0 and 9000000000000),first_verified_promotion_at timestamptz,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(platform_id,normalized_username),check(username ~ '^[a-z][a-z0-9._-]{1,13}[a-z0-9]$'));
create index social_ranking on public.social_accounts(platform_id,total_verified_promotion_cents desc,first_verified_promotion_at asc,id) where account_status='approved';
create index social_location on public.social_accounts(location_id,platform_id) where account_status='approved';
create index social_username_prefix on public.social_accounts(normalized_username text_pattern_ops);
create index social_search_trgm on public.social_accounts using gin ((normalized_username || ' ' || display_name) gin_trgm_ops);
create index location_search_trgm on public.locations using gin (name gin_trgm_ops);
create table public.social_account_owners(social_account_id uuid references public.social_accounts(id),user_id uuid references auth.users(id),verified_at timestamptz not null default now(),primary key(social_account_id,user_id));
create table public.account_claims(id uuid primary key default gen_random_uuid(),social_account_id uuid not null references public.social_accounts(id),user_id uuid not null references auth.users(id),method text not null default 'manual' check(method in('manual','bio_code','oauth')),evidence text not null check(length(evidence) between 10 and 3000),status text not null default 'pending' check(status in('pending','approved','rejected')),created_at timestamptz not null default now());
create unique index one_pending_claim on public.account_claims(social_account_id,user_id) where status='pending';
create table public.promotion_purchases(id uuid primary key default gen_random_uuid(),social_account_id uuid not null references public.social_accounts(id),payer_user_id uuid references auth.users(id),amount_cents bigint not null check(amount_cents between 100 and 9000000000000),currency text not null default 'USD' check(currency='USD'),payment_provider text not null,provider_payment_id text,provider_session_id text,status text not null default 'pending' check(status in('pending','verified','failed','cancelled','partially_refunded','refunded','disputed')),verified_at timestamptz,refunded_amount_cents bigint not null default 0,disputed boolean not null default false,credited_cents bigint not null default 0,status_token_hash text not null,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(payment_provider,provider_payment_id),unique(payment_provider,provider_session_id),check(refunded_amount_cents between 0 and amount_cents),check(credited_cents between 0 and amount_cents));
create index purchases_account on public.promotion_purchases(social_account_id,created_at desc);
create index purchases_payer on public.promotion_purchases(payer_user_id);
create function public.validate_purchase_account() returns trigger language plpgsql set search_path='' as $$begin
perform 1 from public.social_accounts a join public.platforms p on p.id=a.platform_id where a.id=new.social_account_id and a.account_status='approved' and p.enabled for update of a;
if not found then raise exception 'Account unavailable for promotion';end if;return new;end $$;
create trigger active_purchase_account before insert on public.promotion_purchases for each row execute function public.validate_purchase_account();
create table public.payment_sessions(id uuid primary key default gen_random_uuid(),purchase_id uuid not null unique references public.promotion_purchases(id),provider_session_id text not null unique,created_at timestamptz not null default now());
create table public.payment_events(id uuid primary key default gen_random_uuid(),payment_provider text not null,provider_event_id text not null,purchase_id uuid not null references public.promotion_purchases(id),event_type text not null,processed_at timestamptz not null default now(),unique(payment_provider,provider_event_id));
create table public.promotion_adjustments(id uuid primary key default gen_random_uuid(),purchase_id uuid not null references public.promotion_purchases(id),social_account_id uuid not null references public.social_accounts(id),payment_event_id uuid not null unique references public.payment_events(id),delta_cents bigint not null check(delta_cents<>0),reason text not null,created_at timestamptz not null default now());
create index adjustments_account on public.promotion_adjustments(social_account_id,created_at desc);
create table public.public_activity(id uuid primary key default gen_random_uuid(),social_account_id uuid not null references public.social_accounts(id),amount_cents bigint not null,kind text not null,created_at timestamptz not null default now());
create table public.reports(id uuid primary key default gen_random_uuid(),social_account_id uuid not null references public.social_accounts(id),reporter_user_id uuid not null references auth.users(id),reason text not null check(length(reason) between 10 and 2000),status text not null default 'open' check(status in('open','resolved','dismissed')),created_at timestamptz not null default now());
create table public.moderation_actions(id uuid primary key default gen_random_uuid(),social_account_id uuid references public.social_accounts(id),admin_user_id uuid not null references auth.users(id),action text not null,note text not null,created_at timestamptz not null default now());
create table public.admin_audit_log(id uuid primary key default gen_random_uuid(),admin_user_id uuid not null references auth.users(id),action text not null,target_id text not null,created_at timestamptz not null default now());
create table public.analytics_events(id uuid primary key default gen_random_uuid(),event_name text not null check(event_name in('profile_view','outbound_click','boost_click','checkout_start','purchase_verified','share','referral_visit')),social_account_id uuid references public.social_accounts(id),purchase_id uuid references public.promotion_purchases(id),user_id uuid references auth.users(id),created_at timestamptz not null default now());
create index analytics_funnel on public.analytics_events(event_name,created_at);
create table public.notification_preferences(user_id uuid primary key references auth.users(id),promotion_updates boolean not null default false);
create table public.rate_limits(key text primary key,window_start timestamptz not null,hits integer not null);

-- Hierarchy cycles cannot be introduced by an administrative correction.
create function public.prevent_location_cycle() returns trigger language plpgsql set search_path='' as $$
begin
if exists(with recursive chain as (select id,parent_id from public.locations where id=new.parent_id union select l.id,l.parent_id from public.locations l join chain c on l.id=c.parent_id) select 1 from chain where id=new.id) then raise exception 'Location cycle';end if;return new;
end $$;
create trigger location_cycle before insert or update on public.locations for each row execute function public.prevent_location_cycle();
create function public.location_descendants(p_location text) returns table(id text) language sql stable set search_path='' as $$
with recursive tree as(select id from public.locations where id=p_location and enabled union all select l.id from public.locations l join tree t on l.parent_id=t.id where l.enabled)select id from tree;
$$;
create function public.location_ancestors(p_location text) returns table(id text,name text,parent_id text) language sql stable set search_path='' as $$
with recursive tree as(select id,name,parent_id from public.locations where id=p_location and enabled union all select l.id,l.name,l.parent_id from public.locations l join tree t on l.id=t.parent_id where l.enabled)select * from tree;
$$;
create function public.leaderboard(p_location text default 'world',p_platform text default 'snapchat',p_limit integer default 50,p_after integer default 0,p_search text default '') returns jsonb language sql stable set search_path='' as $$
with ranked as(select a.*,l.name as city,coalesce((select x.name from public.location_ancestors(a.location_id) x join public.locations z on z.id=x.id where z.type='country' limit 1),'') as country,row_number() over(order by a.total_verified_promotion_cents desc,a.first_verified_promotion_at asc nulls last,a.id) as rank from public.social_accounts a join public.locations l on l.id=a.location_id where a.account_status='approved' and a.platform_id=p_platform and a.location_id in(select id from public.location_descendants(p_location))), filtered as(select * from ranked where rank>greatest(p_after,0) and (p_search='' or display_name ilike '%'||left(p_search,80)||'%' or normalized_username ilike '%'||left(p_search,80)||'%' or city ilike '%'||left(p_search,80)||'%' or country ilike '%'||left(p_search,80)||'%') order by rank limit least(greatest(p_limit,1),100)) select coalesce(jsonb_agg(to_jsonb(filtered)),'[]'::jsonb) from filtered;
$$;
create function public.account_rank(p_account uuid,p_location text) returns bigint language sql stable set search_path='' as $$
select count(*)+1 from public.social_accounts a,public.social_accounts target where target.id=p_account and target.account_status='approved' and a.account_status='approved' and a.platform_id=target.platform_id and a.location_id in(select id from public.location_descendants(p_location)) and (a.total_verified_promotion_cents>target.total_verified_promotion_cents or (a.total_verified_promotion_cents=target.total_verified_promotion_cents and (coalesce(a.first_verified_promotion_at,'infinity'::timestamptz),a.id)<(coalesce(target.first_verified_promotion_at,'infinity'::timestamptz),target.id)));
$$;
create function public.rank_estimate(p_account uuid,p_location text,p_add bigint) returns bigint language sql stable set search_path='' as $$
select count(*)+1 from public.social_accounts a,public.social_accounts target where target.id=p_account and target.account_status='approved' and a.id<>target.id and a.account_status='approved' and a.platform_id=target.platform_id and a.location_id in(select id from public.location_descendants(p_location)) and (a.total_verified_promotion_cents>target.total_verified_promotion_cents+p_add or (a.total_verified_promotion_cents=target.total_verified_promotion_cents+p_add and (coalesce(a.first_verified_promotion_at,'infinity'::timestamptz),a.id)<(coalesce(target.first_verified_promotion_at,now()),target.id)));
$$;
create function public.rank_opportunity(p_account uuid,p_location text,p_target integer) returns bigint language plpgsql stable set search_path='' as $$
declare a public.social_accounts;r public.social_accounts;extra bigint;
begin
select * into a from public.social_accounts where id=p_account and account_status='approved';if not found or p_target<1 then raise exception 'Invalid account or target';end if;
if public.account_rank(p_account,p_location)<=p_target then return 0;end if;
select * into r from public.social_accounts where account_status='approved' and platform_id=a.platform_id and location_id in(select id from public.location_descendants(p_location)) order by total_verified_promotion_cents desc,first_verified_promotion_at asc nulls last,id offset p_target-1 limit 1;
extra:=r.total_verified_promotion_cents-a.total_verified_promotion_cents;
if (coalesce(a.first_verified_promotion_at,now()),a.id)>=(coalesce(r.first_verified_promotion_at,'infinity'::timestamptz),r.id) then extra:=extra+1;end if;
return greatest(100,extra);
end $$;

-- Service-only entry point. Row locking serializes each purchase. Atomic aggregate
-- increments serialize independent purchases for the same account without lost updates.
create function public.apply_payment_event(p_provider text,p_event text,p_purchase uuid,p_payment text,p_amount bigint,p_currency text,p_verified boolean,p_refunded bigint,p_disputed boolean,p_kind text) returns text language plpgsql set search_path='' as $$
declare p public.promotion_purchases;event_id uuid;desired bigint;delta bigint;v_at timestamptz;
begin
select * into p from public.promotion_purchases where id=p_purchase for update;
if not found then raise exception 'Unknown purchase';end if;
if p.payment_provider<>p_provider or p.amount_cents<>p_amount or p.currency<>upper(p_currency) or p_refunded<0 or p_refunded>p.amount_cents or p_payment is null then raise exception 'Payment mismatch';end if;
if p.provider_payment_id is not null and p.provider_payment_id<>p_payment then raise exception 'Payment identity mismatch';end if;
insert into public.payment_events(payment_provider,provider_event_id,purchase_id,event_type) values(p_provider,p_event,p_purchase,p_kind) on conflict(payment_provider,provider_event_id) do nothing returning id into event_id;
if event_id is null then return 'duplicate';end if;
v_at:=coalesce(p.verified_at,case when p_verified then now() end);
-- Reversals are monotone: stale success events cannot restore reversed value.
p.refunded_amount_cents:=greatest(p.refunded_amount_cents,p_refunded);p.disputed:=p.disputed or p_disputed;
desired:=case when v_at is null or p.disputed then 0 else p.amount_cents-p.refunded_amount_cents end;delta:=desired-p.credited_cents;
update public.promotion_purchases set provider_payment_id=p_payment,verified_at=v_at,refunded_amount_cents=p.refunded_amount_cents,disputed=p.disputed,credited_cents=desired,status=case when p.disputed then 'disputed' when p.refunded_amount_cents=amount_cents then 'refunded' when p.refunded_amount_cents>0 then 'partially_refunded' when v_at is not null then 'verified' when p_kind='failed' then 'failed' else status end,updated_at=now() where id=p.id;
if delta<>0 then
insert into public.promotion_adjustments(purchase_id,social_account_id,payment_event_id,delta_cents,reason) values(p.id,p.social_account_id,event_id,delta,p_kind);
update public.social_accounts set total_verified_promotion_cents=total_verified_promotion_cents+delta,first_verified_promotion_at=case when delta>0 then coalesce(first_verified_promotion_at,v_at) else first_verified_promotion_at end,updated_at=now() where id=p.social_account_id;
insert into public.public_activity(social_account_id,amount_cents,kind) values(p.social_account_id,delta,case when delta>0 then 'promotion' else 'reversal' end);
if delta>0 then insert into public.analytics_events(event_name,social_account_id,purchase_id,user_id) values('purchase_verified',p.social_account_id,p.id,p.payer_user_id);end if;
end if;
return 'processed';
end $$;
create function public.immutable_ledger() returns trigger language plpgsql set search_path='' as $$begin raise exception 'Ledger entries are immutable';end $$;
create trigger immutable_adjustments before update or delete on public.promotion_adjustments for each row execute function public.immutable_ledger();
create trigger immutable_events before update or delete on public.payment_events for each row execute function public.immutable_ledger();
create function public.consume_rate(p_key text,p_limit integer,p_seconds integer) returns boolean language plpgsql set search_path='' as $$declare n integer;begin insert into public.rate_limits(key,window_start,hits) values(p_key,now(),1) on conflict(key) do update set hits=case when public.rate_limits.window_start<now()-make_interval(secs=>p_seconds) then 1 else public.rate_limits.hits+1 end,window_start=case when public.rate_limits.window_start<now()-make_interval(secs=>p_seconds) then now() else public.rate_limits.window_start end returning hits into n;return n<=p_limit;end $$;
create function public.moderate(p_admin uuid,p_account uuid,p_action text,p_note text,p_claim uuid default null,p_location text default null,p_report uuid default null) returns void language plpgsql set search_path='' as $$
declare claim_user uuid;
begin
if not exists(select 1 from public.admin_members where user_id=p_admin) then raise exception 'Admin required';end if;
if length(p_note)<3 then raise exception 'Note required';end if;
perform 1 from public.social_accounts where id=p_account for update;if not found then raise exception 'Unknown account';end if;
if p_action in('approve','suspend','reject') then update public.social_accounts set account_status=case p_action when 'approve' then 'approved' when 'suspend' then 'suspended' else 'rejected' end where id=p_account;
elsif p_action in('approve_claim','reject_claim') then
select user_id into claim_user from public.account_claims where id=p_claim and social_account_id=p_account and status='pending' for update;if not found then raise exception 'Pending claim required';end if;
update public.account_claims set status=case p_action when 'approve_claim' then 'approved' else 'rejected' end where id=p_claim;
if p_action='approve_claim' then insert into public.social_account_owners(social_account_id,user_id) values(p_account,claim_user) on conflict do nothing;update public.social_accounts set ownership_status='verified' where id=p_account;end if;
elsif p_action='verify_location' then if not exists(select 1 from public.locations where id=p_location and enabled) then raise exception 'Invalid location';end if;update public.social_accounts set location_id=p_location,location_verification_status='verified' where id=p_account;
elsif p_action='resolve_report' then update public.reports set status='resolved' where id=p_report and social_account_id=p_account;if not found then raise exception 'Unknown report';end if;
else raise exception 'Unknown action';end if;
insert into public.moderation_actions(social_account_id,admin_user_id,action,note) values(p_account,p_admin,p_action,p_note);insert into public.admin_audit_log(admin_user_id,action,target_id) values(p_admin,p_action,p_account::text);
end $$;

-- Explicit grants AND RLS: private tables have no public access path.
do $$ declare t text;begin for t in select tablename from pg_tables where schemaname='public' loop execute format('alter table public.%I enable row level security',t);execute format('revoke all on public.%I from anon, authenticated',t);execute format('grant all on public.%I to service_role',t);end loop;end $$;
grant select on public.platforms,public.locations,public.social_accounts,public.public_activity to anon,authenticated;
create policy public_platforms on public.platforms for select to anon,authenticated using(enabled);
create policy public_locations on public.locations for select to anon,authenticated using(enabled);
create policy approved_accounts on public.social_accounts for select to anon,authenticated using(account_status='approved');
create policy public_events on public.public_activity for select to anon,authenticated using(exists(select 1 from public.social_accounts a where a.id=social_account_id and a.account_status='approved'));
grant select on public.profiles,public.social_account_owners,public.account_claims,public.promotion_purchases,public.reports,public.notification_preferences to authenticated;
create policy own_profile on public.profiles for select to authenticated using(id=(select auth.uid()));
create policy own_ownership on public.social_account_owners for select to authenticated using(user_id=(select auth.uid()));
create policy own_claims on public.account_claims for select to authenticated using(user_id=(select auth.uid()));
create policy own_purchases on public.promotion_purchases for select to authenticated using(payer_user_id=(select auth.uid()));
create policy own_reports on public.reports for select to authenticated using(reporter_user_id=(select auth.uid()));
create policy own_preferences on public.notification_preferences for select to authenticated using(user_id=(select auth.uid()));
revoke execute on all functions in schema public from public,anon,authenticated;
grant execute on all functions in schema public to service_role;
grant execute on function public.location_descendants(text),public.location_ancestors(text),public.leaderboard(text,text,integer,integer,text),public.account_rank(uuid,text),public.rank_estimate(uuid,text,bigint),public.rank_opportunity(uuid,text,integer) to anon,authenticated;
