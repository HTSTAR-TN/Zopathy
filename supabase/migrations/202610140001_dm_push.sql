begin;
create extension if not exists pg_net;
create extension if not exists pg_cron with schema pg_catalog;
create table public.zopathy_push_devices(
 id uuid primary key default gen_random_uuid(),user_id uuid not null references public.zopathy_profiles(id) on delete cascade,
 endpoint text unique not null check(length(endpoint)<=4096 and endpoint ~ '^https://(fcm[.]googleapis[.]com|[a-z0-9-]+[.]push[.]services[.]mozilla[.]com|web[.]push[.]apple[.]com|[a-z0-9-]+[.]notify[.]windows[.]com)(/|:443/)'),
 p256dh text not null check(p256dh ~ '^[A-Za-z0-9_-]{87}$'),auth_key text not null check(auth_key ~ '^[A-Za-z0-9_-]{22}$'),updated_at timestamptz not null default now()
);
create index zopathy_push_devices_owner on public.zopathy_push_devices(user_id);
alter table public.zopathy_push_devices enable row level security;
revoke all on public.zopathy_push_devices from anon,authenticated;
grant select,delete on public.zopathy_push_devices to authenticated;
grant all on public.zopathy_push_devices to service_role;
create policy "Own push devices" on public.zopathy_push_devices for select to authenticated using(user_id=(select auth.uid()));
create policy "Disable own push devices" on public.zopathy_push_devices for delete to authenticated using(user_id=(select auth.uid()));
create function public.zopathy_register_push(p_endpoint text,p_p256dh text,p_auth text) returns uuid language plpgsql security definer set search_path='' as $$
declare me uuid:=auth.uid(); saved uuid;
begin
 if me is null then raise exception 'Sign in to enable notifications.';end if;
 perform pg_advisory_xact_lock(hashtextextended('push:'||me::text,0));
 if not exists(select 1 from public.zopathy_push_devices where endpoint=p_endpoint and user_id=me) and (select count(*) from public.zopathy_push_devices where user_id=me)>=10 then raise exception 'Disable an old device before adding another.';end if;
 insert into public.zopathy_push_devices(user_id,endpoint,p256dh,auth_key) values(me,p_endpoint,p_p256dh,p_auth)
 on conflict(endpoint) do update set user_id=me,p256dh=p_p256dh,auth_key=p_auth,updated_at=now()
 where zopathy_push_devices.user_id=me or (zopathy_push_devices.p256dh=p_p256dh and zopathy_push_devices.auth_key=p_auth)
 returning id into saved;
 if saved is null then raise exception 'Reconnect notifications on this device.';end if;return saved;
end $$;
revoke all on function public.zopathy_register_push(text,text,text) from public;
grant execute on function public.zopathy_register_push(text,text,text) to authenticated;
create table public.zopathy_push_keys(id boolean primary key check(id),public_key text not null,private_key text not null);
create table public.zopathy_push_jobs(
 id uuid primary key references public.zopathy_messages(id) on delete cascade,recipient_id uuid not null,sender_id uuid not null,
 token text not null default encode(extensions.gen_random_bytes(32),'hex'),created_at timestamptz not null default now(),
 claimed_at timestamptz,completed_at timestamptz,last_requested_at timestamptz,attempts integer not null default 0,last_error text
);
create index zopathy_push_pending on public.zopathy_push_jobs(created_at) where completed_at is null;
alter table public.zopathy_push_keys enable row level security;
alter table public.zopathy_push_jobs enable row level security;
revoke all on public.zopathy_push_keys,public.zopathy_push_jobs from anon,authenticated;
grant all on public.zopathy_push_keys,public.zopathy_push_jobs to service_role;
create function public.zopathy_request_push(p_id uuid,p_token text) returns void language plpgsql security definer set search_path='' as $$
begin
 perform net.http_post(url:='https://krofptcyqmopbkjkvanz.supabase.co/functions/v1/dm-push',
  headers:=jsonb_build_object('Content-Type','application/json','apikey','sb_publishable_AM2W8VHGxt2YM-amLZuUNg_ociOu-Ti'),
  body:=jsonb_build_object('id',p_id,'token',p_token),timeout_milliseconds:=15000);
end $$;
revoke all on function public.zopathy_request_push(uuid,text) from public;
create function public.zopathy_queue_dm_push() returns trigger language plpgsql security definer set search_path='' as $$
declare secret text;
begin
 if not exists(select 1 from public.zopathy_push_devices where user_id=new.recipient_id) then return new;end if;
 insert into public.zopathy_push_jobs(id,recipient_id,sender_id,last_requested_at) values(new.id,new.recipient_id,new.sender_id,now()) returning token into secret;
 begin perform public.zopathy_request_push(new.id,secret);exception when others then null;end;
 return new;
exception when others then return new;
end $$;
revoke all on function public.zopathy_queue_dm_push() from public;
create trigger zopathy_dm_push after insert on public.zopathy_messages for each row execute function public.zopathy_queue_dm_push();
create function public.zopathy_retry_dm_push() returns void language plpgsql security definer set search_path='' as $$
declare job record;
begin
 update public.zopathy_push_jobs set completed_at=now(),last_error='Expired' where completed_at is null and (created_at<now()-interval '24 hours' or attempts>=8);
 for job in select id,token from public.zopathy_push_jobs where completed_at is null and attempts<8 and (last_requested_at is null or last_requested_at<now()-interval '1 minute') and (claimed_at is null or claimed_at<now()-interval '2 minutes') order by created_at limit 50 for update skip locked loop
  update public.zopathy_push_jobs set claimed_at=null,last_requested_at=now() where id=job.id;
  begin perform public.zopathy_request_push(job.id,job.token);exception when others then null;end;
 end loop;
end $$;
revoke all on function public.zopathy_retry_dm_push() from public;
select cron.schedule('zopathy-dm-push-retry','* * * * *','select public.zopathy_retry_dm_push()');
notify pgrst,'reload schema';
commit;
