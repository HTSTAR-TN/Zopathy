begin;
create function public.zopathy_private_space_media_guard() returns trigger language plpgsql set search_path='' as $$
begin
 if new.group_id is not null and exists(select 1 from public.zopathy_groups g where g.id=new.group_id and g.visibility='private') and exists(select 1 from jsonb_array_elements(coalesce(new.blocks,'[]'::jsonb)) b where b->>'type' in ('image','media') and coalesce(b->>'url','')<>'') then
  raise exception 'Private Space media must use the protected gallery' using errcode='23514';
 end if;
 return new;
end;$$;
revoke all on function public.zopathy_private_space_media_guard() from public;
create trigger zopathy_private_space_media_guard before insert or update on public.zopathy_posts for each row execute function public.zopathy_private_space_media_guard();
notify pgrst,'reload schema';
commit;
