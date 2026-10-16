-- Run once in Supabase SQL Editor. Existing profile RLS remains unchanged.
begin;
alter table public.profiles add column notification_email text
  check (notification_email is null or (
    length(notification_email) between 3 and 254 and
    notification_email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  ));

create or replace function public.admin_save_settings(p_input jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare owner uuid; day integer; zone text; recipient text;
begin
  owner=meridian_private.require_owner(); perform 1 from public.profiles where id=owner for update;
  zone=p_input->>'timezone';
  if not exists(select 1 from pg_catalog.pg_timezone_names where name=zone) or length(btrim(coalesce(p_input->>'name',''))) not between 1 and 100 or length(coalesce(p_input->>'role',''))>100 or length(coalesce(p_input->>'email',''))>254 or coalesce(p_input->>'email','') !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' or jsonb_typeof(p_input->'days')<>'array' or jsonb_array_length(p_input->'days')=0 or (p_input->>'start')::time >= (p_input->>'end')::time then raise exception 'Check profile and working hours.'; end if;
  recipient=nullif(btrim(p_input->>'notificationEmail'),'');
  if recipient is not null and (length(recipient)>254 or recipient !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$') then raise exception 'Enter a valid admin notification email.'; end if;
  update public.profiles set display_name=btrim(p_input->>'name'),role_label=coalesce(p_input->>'role',''),email=btrim(p_input->>'email'),timezone=zone,
    notification_email=case when p_input ? 'notificationEmail' then recipient else notification_email end,
    updated_at=now() where id=owner;
  update public.booking_preferences set duration_minutes=(p_input->>'duration')::integer,buffer_minutes=(p_input->>'buffer')::integer,minimum_notice_hours=(p_input->>'notice')::integer,booking_horizon_days=(p_input->>'horizon')::integer,updated_at=now() where owner_id=owner;
  for day in 0..6 loop
    insert into public.availability_rules(owner_id,weekday,start_local_time,end_local_time,enabled) values(owner,day,(p_input->>'start')::time,(p_input->>'end')::time,(p_input->'days') @> to_jsonb(array[day]))
    on conflict(owner_id,weekday) do update set start_local_time=excluded.start_local_time,end_local_time=excluded.end_local_time,enabled=excluded.enabled,updated_at=now();
  end loop;
  if exists(select 1 from public.appointments a join public.appointments b on a.owner_id=b.owner_id and a.id<b.id join public.booking_preferences p on p.owner_id=a.owner_id
    where a.owner_id=owner and a.status in ('pending','confirmed') and b.status in ('pending','confirmed') and a.starts_at>now() and b.starts_at>now()
    and tstzrange(a.starts_at,a.starts_at+make_interval(mins=>a.duration_minutes+p.buffer_minutes),'[)') && tstzrange(b.starts_at,b.starts_at+make_interval(mins=>b.duration_minutes+p.buffer_minutes),'[)')) then raise exception 'This buffer conflicts with existing appointments.'; end if;
  return public.admin_snapshot();
end $$;
revoke all on function public.admin_save_settings(jsonb) from public, anon;
grant execute on function public.admin_save_settings(jsonb) to authenticated;
notify pgrst,'reload schema';
commit;
