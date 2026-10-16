begin;
-- Extend rather than replace the existing communities and memberships.
alter table public.zopathy_groups add column if not exists visibility text not null default 'public' check (visibility in ('public','private'));
alter table public.zopathy_groups add column if not exists icon_path text not null default '';
alter table public.zopathy_groups add column if not exists background text not null default '#101014' check(background ~ '^#[0-9a-fA-F]{6}$');
alter table public.zopathy_groups add column if not exists layout jsonb not null default '[{"id":"discussions","type":"discussions","width":12},{"id":"members","type":"members","width":6}]';
alter table public.zopathy_group_members drop constraint if exists zopathy_group_members_role_check;
alter table public.zopathy_group_members add constraint zopathy_group_members_role_check check(role in ('owner','moderator','member'));
alter table public.zopathy_group_members drop constraint if exists zopathy_group_members_status_check;
alter table public.zopathy_group_members add constraint zopathy_group_members_status_check check(status in ('active','pending','banned'));

create function public.zopathy_space_member(gid uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.zopathy_group_members where group_id=gid and user_id=auth.uid() and status='active'); $$;
create function public.zopathy_space_manager(gid uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.zopathy_group_members m join public.zopathy_groups g on g.id=m.group_id where g.id=gid and m.user_id=auth.uid() and m.status='active' and (g.owner_id=auth.uid() or m.role='moderator')); $$;
create function public.zopathy_space_visible(gid uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.zopathy_groups where id=gid and (visibility='public' or owner_id=auth.uid() or public.zopathy_space_member(gid))); $$;
create function public.zopathy_valid_space_layout(value jsonb) returns boolean language plpgsql immutable set search_path='' as $$
declare c jsonb; ids text[]:='{}';
begin
 if jsonb_typeof(value)<>'array' or jsonb_array_length(value)>16 then return false;end if;
 for c in select * from jsonb_array_elements(value) loop
  if jsonb_typeof(c)<>'object' or not(c ?& array['id','type','width']) or (c-'id'-'type'-'width')<>'{}'::jsonb or jsonb_typeof(c->'id')<>'string' or jsonb_typeof(c->'type')<>'string' or c->>'id' !~ '^[a-z0-9-]{1,50}$' or c->>'id'=any(ids) or c->>'type' not in ('discussions','announcements','gallery','events','members','resources','projects','hangouts') or c->'width' not in ('6'::jsonb,'12'::jsonb) then return false;end if;
  ids:=array_append(ids,c->>'id');
 end loop;return true;
exception when others then return false;end;$$;
alter table public.zopathy_groups add constraint zopathy_space_layout_valid check(public.zopathy_valid_space_layout(layout));
create function public.zopathy_spaces_version() returns integer language sql immutable as $$select 1$$;
revoke all on function public.zopathy_space_member(uuid),public.zopathy_space_manager(uuid),public.zopathy_space_visible(uuid),public.zopathy_valid_space_layout(jsonb),public.zopathy_spaces_version() from public;
grant execute on function public.zopathy_space_member(uuid),public.zopathy_space_manager(uuid),public.zopathy_space_visible(uuid),public.zopathy_valid_space_layout(jsonb),public.zopathy_spaces_version() to anon,authenticated;

drop policy "Public groups" on public.zopathy_groups;
create policy "Visible Spaces" on public.zopathy_groups for select to anon,authenticated using(public.zopathy_space_visible(id));
drop policy "Visible group memberships" on public.zopathy_group_members;
create policy "Visible Space memberships" on public.zopathy_group_members for select to anon,authenticated using((status='active' and public.zopathy_space_visible(group_id)) or user_id=auth.uid() or public.zopathy_space_manager(group_id));
-- Restrictive policy also covers the existing site-admin SELECT policy.
create policy "Space content privacy" on public.zopathy_posts as restrictive for select to anon,authenticated using(group_id is null or public.zopathy_space_visible(group_id));
-- Existing comments/reaction SELECT policies query posts and inherit its privacy.

create table public.zopathy_space_entries(
 id uuid primary key default gen_random_uuid(),space_id uuid not null references public.zopathy_groups(id),
 user_id uuid not null default auth.uid() references public.zopathy_profiles(id),
 kind text not null check(kind in ('discussions','announcements','gallery','events','resources','projects','hangouts')),
 title text not null check(char_length(trim(title)) between 1 and 200),body text not null default '' check(char_length(body)<=10000),
 url text not null default '' check(url='' or (char_length(url)<=2000 and url ~ '^https://[^/@[:space:]]+([/?#][^[:space:]]*)?$')),
 image_path text not null default '',starts_at timestamptz,status text not null default 'planned' check(status in ('planned','active','complete')),
 created_at timestamptz not null default now(),deleted_at timestamptz,
 constraint space_entry_fields check((kind<>'events' or starts_at is not null) and (kind<>'resources' or url<>'') and (kind<>'gallery' or image_path<>''))
);
create index zopathy_space_entries_recent on public.zopathy_space_entries(space_id,kind,created_at desc) where deleted_at is null;
create table public.zopathy_space_replies(
 id uuid primary key default gen_random_uuid(),entry_id uuid not null references public.zopathy_space_entries(id),user_id uuid not null default auth.uid() references public.zopathy_profiles(id),
 body text not null check(char_length(trim(body)) between 1 and 5000),created_at timestamptz not null default now(),deleted_at timestamptz
);
create index zopathy_space_replies_thread on public.zopathy_space_replies(entry_id,created_at);
alter table public.zopathy_space_entries enable row level security;
alter table public.zopathy_space_replies enable row level security;
revoke all on public.zopathy_space_entries,public.zopathy_space_replies from anon,authenticated;
grant select on public.zopathy_space_entries,public.zopathy_space_replies to anon,authenticated;
grant insert(space_id,user_id,kind,title,body,url,image_path,starts_at,status) on public.zopathy_space_entries to authenticated;
grant insert(entry_id,user_id,body) on public.zopathy_space_replies to authenticated;
grant update(deleted_at) on public.zopathy_space_entries,public.zopathy_space_replies to authenticated;
create policy "Read Space entries" on public.zopathy_space_entries for select to anon,authenticated using(public.zopathy_space_visible(space_id) and (deleted_at is null or user_id=auth.uid() or public.zopathy_space_manager(space_id)));
create policy "Create Space entries" on public.zopathy_space_entries for insert to authenticated with check(user_id=auth.uid() and public.zopathy_group_participant(space_id) and (kind in ('discussions','gallery','projects') or public.zopathy_space_manager(space_id)) and (image_path='' or image_path like space_id::text||'/'||auth.uid()::text||'/%'));
create policy "Moderate Space entries" on public.zopathy_space_entries for update to authenticated using(public.zopathy_space_member(space_id) and (user_id=auth.uid() or public.zopathy_space_manager(space_id))) with check(public.zopathy_space_member(space_id) and (user_id=auth.uid() or public.zopathy_space_manager(space_id)));
create policy "Read Space replies" on public.zopathy_space_replies for select to anon,authenticated using((deleted_at is null or user_id=auth.uid()) and exists(select 1 from public.zopathy_space_entries e where e.id=entry_id and e.kind='discussions' and e.deleted_at is null and public.zopathy_space_visible(e.space_id)));
create policy "Create Space replies" on public.zopathy_space_replies for insert to authenticated with check(user_id=auth.uid() and exists(select 1 from public.zopathy_space_entries e where e.id=entry_id and e.kind='discussions' and e.deleted_at is null and public.zopathy_group_participant(e.space_id)));
create policy "Moderate Space replies" on public.zopathy_space_replies for update to authenticated using(exists(select 1 from public.zopathy_space_entries e where e.id=entry_id and public.zopathy_space_member(e.space_id) and (user_id=auth.uid() or public.zopathy_space_manager(e.space_id)))) with check(exists(select 1 from public.zopathy_space_entries e where e.id=entry_id and public.zopathy_space_member(e.space_id) and (user_id=auth.uid() or public.zopathy_space_manager(e.space_id))));

create function public.zopathy_save_space(p_id uuid,p_slug text,p_name text,p_description text,p_rules text,p_visibility text,p_icon text,p_banner text,p_accent text,p_background text,p_layout jsonb)
returns uuid language plpgsql security definer set search_path='' as $$
declare g public.zopathy_groups;
begin
 if auth.uid() is null then raise exception 'Sign in to manage Spaces' using errcode='42501';end if;
 select * into g from public.zopathy_groups where id=p_id for update;
 if found and g.owner_id<>auth.uid() then raise exception 'Only the owner can change Space settings' using errcode='42501';end if;
 if not found and (select count(*) from public.zopathy_groups where owner_id=auth.uid() and archived_at is null)>=20 then raise exception 'You can own up to 20 active Spaces';end if;
 if p_visibility not in ('public','private') or not public.zopathy_valid_space_layout(p_layout) then raise exception 'Invalid Space configuration';end if;
 if p_slug in ('create','settings','edit') then raise exception 'Choose a different Space address';end if;
 if exists(select 1 from unnest(array[p_icon,p_banner]) path where length(path)>2000 or (path<>'' and path not like p_id::text||'/'||auth.uid()::text||'/%' and path not in (coalesce(g.icon_path,''),coalesce(g.banner_url,'')))) then raise exception 'Invalid Space image';end if;
 -- A public media URL cannot become private merely by changing metadata.
 if p_visibility='private' and (p_banner like 'https://%' or exists(select 1 from public.zopathy_posts where group_id=p_id and blocks<>'[]'::jsonb)) then raise exception 'This Space has legacy public media. Keep it public or create a new private Space.';end if;
 if g.id is null then
  insert into public.zopathy_groups(id,owner_id,slug,name,description,rules,visibility,icon_path,banner_url,accent,background,layout) values(p_id,auth.uid(),lower(trim(p_slug)),trim(p_name),p_description,p_rules,p_visibility,p_icon,p_banner,p_accent,p_background,p_layout);
  insert into public.zopathy_group_members(group_id,user_id,role) values(p_id,auth.uid(),'owner');
 else
  update public.zopathy_groups set name=trim(p_name),description=p_description,rules=p_rules,visibility=p_visibility,icon_path=p_icon,banner_url=p_banner,accent=p_accent,background=p_background,layout=p_layout where id=p_id;
 end if;return p_id;
end;$$;
create function public.zopathy_save_space_layout(p_space uuid,p_layout jsonb) returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.zopathy_space_manager(p_space) then raise exception 'Only Space managers can edit layouts' using errcode='42501';end if;
 if not public.zopathy_valid_space_layout(p_layout) then raise exception 'Invalid Space layout';end if;
 update public.zopathy_groups set layout=p_layout where id=p_space;
end;$$;
create or replace function public.zopathy_join_group(p_group uuid) returns void language plpgsql security definer set search_path='' as $$
declare g public.zopathy_groups;
begin
 if auth.uid() is null then raise exception 'Sign in to join' using errcode='42501';end if;
 select * into g from public.zopathy_groups where id=p_group and archived_at is null;
 if not found then raise exception 'Space unavailable';end if;
 if exists(select 1 from public.zopathy_group_members where group_id=p_group and user_id=auth.uid() and status='banned') then raise exception 'Your membership is restricted' using errcode='42501';end if;
 insert into public.zopathy_group_members(group_id,user_id,status) values(p_group,auth.uid(),case when g.visibility='private' then 'pending' else 'active' end) on conflict do nothing;
end;$$;
create function public.zopathy_manage_space_member(p_space uuid,p_user uuid,p_action text) returns void language plpgsql security definer set search_path='' as $$
declare target public.zopathy_group_members;
begin
 perform 1 from public.zopathy_groups where id=p_space for update;
 if not public.zopathy_space_manager(p_space) then raise exception 'Space manager access required' using errcode='42501';end if;
 select * into target from public.zopathy_group_members where group_id=p_space and user_id=p_user;
 if not found or target.role='owner' or p_user=auth.uid() then raise exception 'This membership cannot be changed';end if;
 if not public.zopathy_group_owner(p_space) and (target.role='moderator' or p_action in ('promote','demote')) then raise exception 'Only the owner can manage moderators' using errcode='42501';end if;
 if p_action='approve' and target.status='pending' then update public.zopathy_group_members set status='active' where group_id=p_space and user_id=p_user;
 elsif p_action='ban' then update public.zopathy_group_members set status='banned' where group_id=p_space and user_id=p_user;
 elsif p_action='unban' and target.status='banned' then update public.zopathy_group_members set status='pending' where group_id=p_space and user_id=p_user;
 elsif p_action='promote' and target.status='active' then update public.zopathy_group_members set role='moderator' where group_id=p_space and user_id=p_user;
 elsif p_action='demote' then update public.zopathy_group_members set role='member' where group_id=p_space and user_id=p_user;
 else raise exception 'Invalid membership action';end if;
end;$$;
-- A link holder may request access by address without reading private metadata.
create function public.zopathy_request_space(p_slug text) returns void language plpgsql security definer set search_path='' as $$
declare gid uuid;
begin
 if auth.uid() is null then raise exception 'Sign in to request access' using errcode='42501';end if;
 select id into gid from public.zopathy_groups where slug=p_slug and archived_at is null;
 if gid is not null then perform public.zopathy_join_group(gid);end if;
end;$$;
revoke all on function public.zopathy_request_space(text) from public,anon;
grant execute on function public.zopathy_request_space(text) to authenticated;
-- Ordinary table grants remain column-scoped; visibility/layout changes require RPCs.
create function public.zopathy_guard_space_legacy_update() returns trigger language plpgsql set search_path='' as $$
begin
 if current_user in ('anon','authenticated') and (new.visibility is distinct from old.visibility or new.layout is distinct from old.layout or new.owner_id<>old.owner_id or new.icon_path<>old.icon_path or new.background<>old.background) then raise exception 'Use Space settings' using errcode='42501';end if;
 if new.visibility='private' and new.banner_url like 'https://%' then raise exception 'Private Spaces require private image storage';end if;
 return new;
end;$$;
create trigger zopathy_space_legacy_guard before update on public.zopathy_groups for each row execute function public.zopathy_guard_space_legacy_update();
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('zopathy-spaces','zopathy-spaces',false,10485760,array['image/png','image/jpeg','image/webp','image/gif']) on conflict(id) do nothing;
create function public.zopathy_space_storage_access(path text,writing boolean default false) returns boolean language plpgsql stable security definer set search_path='' as $$
declare gid uuid;
begin
 gid:=split_part(path,'/',1)::uuid;
 if writing then return split_part(path,'/',2)=auth.uid()::text and (public.zopathy_group_participant(gid) or not exists(select 1 from public.zopathy_groups where id=gid));end if;
 return public.zopathy_space_visible(gid);
exception when invalid_text_representation then return false;end;$$;
create policy "Read permitted Space images" on storage.objects for select to anon,authenticated using(bucket_id='zopathy-spaces' and public.zopathy_space_storage_access(name));
create policy "Upload Space images" on storage.objects for insert to authenticated with check(bucket_id='zopathy-spaces' and public.zopathy_space_storage_access(name,true));
create policy "Delete own Space images" on storage.objects for delete to authenticated using(bucket_id='zopathy-spaces' and split_part(name,'/',2)=auth.uid()::text);
revoke all on function public.zopathy_save_space(uuid,text,text,text,text,text,text,text,text,text,jsonb),public.zopathy_save_space_layout(uuid,jsonb),public.zopathy_manage_space_member(uuid,uuid,text),public.zopathy_guard_space_legacy_update(),public.zopathy_space_storage_access(text,boolean) from public;
grant execute on function public.zopathy_save_space(uuid,text,text,text,text,text,text,text,text,text,jsonb),public.zopathy_save_space_layout(uuid,jsonb),public.zopathy_manage_space_member(uuid,uuid,text) to authenticated;
grant execute on function public.zopathy_space_storage_access(text,boolean) to anon,authenticated;
notify pgrst,'reload schema';
commit;
