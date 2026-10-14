begin;
alter table public.zopathy_posts add column post_type text not null default 'standard' check(post_type in('standard','slideshow','guide'));
alter table public.zopathy_posts add constraint zopathy_post_format_valid check((post_type<>'slideshow' or jsonb_array_length(blocks)>=2) and (post_type<>'guide' or (length(btrim(title))>0 and (length(btrim(body))>0 or jsonb_array_length(blocks)>0))));
grant insert(post_type),update(post_type) on public.zopathy_posts to authenticated;
update storage.buckets set file_size_limit=52428800 where id='zopathy-media';
notify pgrst,'reload schema';
commit;
