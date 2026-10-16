begin;
alter policy "Read visible posts" on public.zopathy_posts using(deleted_at is null or user_id=auth.uid() or (moderated_at is not null and group_id is not null and public.zopathy_space_manager(group_id)));
create or replace function public.zopathy_moderate_group_post(p_post uuid,p_removed boolean)
returns void language plpgsql security definer set search_path='' as $$
declare gid uuid; removed timestamptz; moderated timestamptz;
begin
 select group_id,deleted_at,moderated_at into gid,removed,moderated from public.zopathy_posts where id=p_post;
 if gid is null or not public.zopathy_space_manager(gid) then raise exception 'Only Space managers can moderate it' using errcode='42501';end if;
 if p_removed and removed is not null and moderated is null then raise exception 'This post was already removed by its author';end if;
 if not p_removed and moderated is null then raise exception 'This post has no Space moderation to restore';end if;
 update public.zopathy_posts set moderated_at=case when p_removed then now() else null end,deleted_at=case when p_removed then now() else null end where id=p_post;
end;$$;
notify pgrst,'reload schema';
commit;
