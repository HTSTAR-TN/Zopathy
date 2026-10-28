begin;
-- No new tables or ownership policies. Optional metadata stays in appearance.widgetStudio.
create or replace function public.zopathy_valid_profile_regions(appearance jsonb)
returns boolean language plpgsql immutable set search_path='' as $$
declare value jsonb; region text; item jsonb; seen text[]; key text;
begin
 if not (appearance ? 'widgetStudio') or appearance->'widgetStudio'='null'::jsonb then return true; end if;
 value:=appearance->'widgetStudio';
 if jsonb_typeof(value)<>'object' or value->'version' is distinct from '1'::jsonb then return false; end if;
 for key in select jsonb_object_keys(value) loop
  if key<>all(array['version','hotdog','hamburger','favoriteIds']) then return false; end if;
 end loop;
 foreach region in array array['hotdog','hamburger'] loop
  if jsonb_typeof(value->region) is distinct from 'array' or jsonb_array_length(value->region)>3 then return false; end if;
  seen:='{}';
  for item in select * from jsonb_array_elements(value->region) loop
   if jsonb_typeof(item)<>'string' then return false; end if;
   key:=item#>>'{}';
   if key=any(seen) then return false; end if;
   if region='hotdog' and key<>all(array['spaces','following','followers']) then return false; end if;
   if region='hamburger' and key<>all(array['posts','favorites','gallery']) then return false; end if;
   seen:=array_append(seen,key);
  end loop;
 end loop;
 if jsonb_typeof(value->'favoriteIds') is distinct from 'array' or jsonb_array_length(value->'favoriteIds')>24 then return false; end if;
 seen:='{}';
 for item in select * from jsonb_array_elements(value->'favoriteIds') loop
  if jsonb_typeof(item)<>'string' then return false; end if;
  key:=item#>>'{}';
  if key !~* '^[a-f0-9]{8}-([a-f0-9]{4}-){3}[a-f0-9]{12}$' or key=any(seen) then return false; end if;
  seen:=array_append(seen,key);
 end loop;
 return true;
exception when others then return false;
end; $$;
revoke all on function public.zopathy_valid_profile_regions(jsonb) from public;
grant execute on function public.zopathy_valid_profile_regions(jsonb) to authenticated;
do $$ begin
 if not exists(select 1 from pg_constraint where conname='zopathy_profile_regions_valid' and conrelid='public.zopathy_profiles'::regclass) then
  alter table public.zopathy_profiles add constraint zopathy_profile_regions_valid check(public.zopathy_valid_profile_regions(appearance)) not valid;
 end if;
end $$;
-- Existing records without this optional key continue to validate unchanged.
alter table public.zopathy_profiles validate constraint zopathy_profile_regions_valid;
commit;
