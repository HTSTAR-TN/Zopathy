-- REQUIRED FOR ACCOUNT-SYNCED HOME/EXPLORE PREFERENCE. NOT EXECUTED.
-- Existing owner-only preferences policies are retained. No post/profile schema changes.
begin;
alter table public.zopathy_preferences
 add column if not exists browse_destination text not null default 'home'
 check (browse_destination in ('home','explore'));
grant insert(browse_destination), update(browse_destination)
 on public.zopathy_preferences to authenticated;
commit;
