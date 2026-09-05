-- Keep extension objects outside the API-exposed public schema.
create schema if not exists extensions;
alter extension pg_trgm set schema extensions;

-- Cover foreign keys used by ownership, moderation, reporting, ledger, and analytics flows.
create index account_claims_user on public.account_claims(user_id);
create index admin_audit_admin on public.admin_audit_log(admin_user_id);
create index analytics_purchase on public.analytics_events(purchase_id);
create index analytics_account on public.analytics_events(social_account_id);
create index analytics_user on public.analytics_events(user_id);
create index moderation_admin on public.moderation_actions(admin_user_id);
create index moderation_account on public.moderation_actions(social_account_id);
create index payment_events_purchase on public.payment_events(purchase_id);
create index adjustments_purchase on public.promotion_adjustments(purchase_id);
create index public_activity_account on public.public_activity(social_account_id);
create index reports_reporter on public.reports(reporter_user_id);
create index reports_account on public.reports(social_account_id);
create index social_owners_user on public.social_account_owners(user_id);
