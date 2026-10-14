-- Admin is an authoritative database permission. Tester has no special access.
begin;
alter table public.zopathy_profiles add column if not exists admin_badge boolean not null default false;
alter table public.zopathy_profiles add column if not exists tester_badge boolean not null default false;
alter table public.zopathy_posts add column if not exists site_removed_at timestamptz;
alter table public.zopathy_posts add column if not exists site_previous_deleted_at timestamptz;
alter table public.zopathy_posts add column if not exists site_removal_reason text not null default '';
create table if not exists public.zopathy_admin_log (
 id bigint generated always as identity primary key,
 actor_id uuid, target_id uuid not null, action text not null,
 details jsonb not null default '{}', created_at timestamptz not null default now()
);
alter table public.zopathy_admin_log enable row level security;
revoke all on public.zopathy_admin_log from anon,authenticated;
grant select on public.zopathy_admin_log to authenticated;
create or replace function public.zopathy_is_admin()
returns boolean language sql stable security definer set search_path='' as $$
 select coalesce((select admin_badge from public.zopathy_profiles where id=auth.uid()),false);
$$;
revoke all on function public.zopathy_is_admin() from public,anon;
grant execute on function public.zopathy_is_admin() to authenticated;
drop policy if exists "Admin audit access" on public.zopathy_admin_log;
create policy "Admin audit access" on public.zopathy_admin_log for select to authenticated using(public.zopathy_is_admin());
drop policy if exists "Admin removed post access" on public.zopathy_posts;
create policy "Admin removed post access" on public.zopathy_posts for select to authenticated using(public.zopathy_is_admin());
-- Existing column-scoped grants exclude the new badge/moderation columns.
create or replace function public.zopathy_keep_site_removal()
returns trigger language plpgsql set search_path='' as $$
begin
 if new.site_removed_at is not null and new.deleted_at is null then
  new.deleted_at:=new.site_removed_at;
 end if;
 return new;
end; $$;
revoke all on function public.zopathy_keep_site_removal() from public,anon,authenticated;
drop trigger if exists zopathy_site_removal_guard on public.zopathy_posts;
create trigger zopathy_site_removal_guard before update on public.zopathy_posts for each row execute function public.zopathy_keep_site_removal();
create or replace function public.zopathy_set_badge(p_target uuid,p_badge text,p_enabled boolean)
returns void language plpgsql security definer set search_path='' as $$
declare previous boolean;
begin
 perform pg_advisory_xact_lock(20261013,710);
 if not public.zopathy_is_admin() then raise exception 'Admin access required' using errcode='42501'; end if;
 if p_badge is null or p_badge not in ('admin','tester') or p_enabled is null then raise exception 'Invalid badge'; end if;
 select case when p_badge='admin' then admin_badge else tester_badge end into previous from public.zopathy_profiles where id=p_target for update;
 if not found then raise exception 'Member not found'; end if;
 if previous=p_enabled then return; end if;
 if p_badge='admin' and not p_enabled and (select count(*) from public.zopathy_profiles where admin_badge)<=1 then raise exception 'Keep at least one admin'; end if;
 if p_badge='admin' then update public.zopathy_profiles set admin_badge=p_enabled where id=p_target;
 else update public.zopathy_profiles set tester_badge=p_enabled where id=p_target; end if;
 insert into public.zopathy_admin_log(actor_id,target_id,action,details) values(auth.uid(),p_target,'badge',jsonb_build_object('badge',p_badge,'enabled',p_enabled));
end; $$;
create or replace function public.zopathy_moderate_post(p_post uuid,p_removed boolean,p_reason text default '')
returns void language plpgsql security definer set search_path='' as $$
declare post public.zopathy_posts%rowtype;
begin
 -- Serialize against revocation; all privileged mutations take this lock.
 perform pg_advisory_xact_lock(20261013,710);
 if not public.zopathy_is_admin() then raise exception 'Admin access required' using errcode='42501'; end if;
 if p_removed is null or char_length(coalesce(p_reason,''))>300 then raise exception 'Invalid moderation request'; end if;
 select * into post from public.zopathy_posts where id=p_post for update;
 if not found then raise exception 'Post not found'; end if;
 if p_removed and post.site_removed_at is null then
  if char_length(trim(coalesce(p_reason,'')))=0 then raise exception 'Enter a removal reason'; end if;
  update public.zopathy_posts set site_previous_deleted_at=deleted_at,site_removed_at=now(),deleted_at=coalesce(deleted_at,now()),site_removal_reason=trim(p_reason) where id=p_post;
 elsif not p_removed and post.site_removed_at is not null then
  update public.zopathy_posts set site_removed_at=null,site_removal_reason='',site_previous_deleted_at=null,
   deleted_at=case when moderated_at is not null then coalesce(post.site_previous_deleted_at,moderated_at) else post.site_previous_deleted_at end where id=p_post;
 else return; end if;
 insert into public.zopathy_admin_log(actor_id,target_id,action,details) values(auth.uid(),p_post,case when p_removed then 'remove_post' else 'restore_post' end,jsonb_build_object('reason',coalesce(p_reason,'')));
end; $$;
revoke all on function public.zopathy_set_badge(uuid,text,boolean),public.zopathy_moderate_post(uuid,boolean,text) from public,anon;
grant execute on function public.zopathy_set_badge(uuid,text,boolean),public.zopathy_moderate_post(uuid,boolean,text) to authenticated;
notify pgrst,'reload schema';
commit;
-- Bootstrap the first admin only with the owner's explicit approval in SQL Editor.
