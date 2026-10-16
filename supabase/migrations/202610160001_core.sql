-- Core MVP only. Run as database owner in Supabase SQL Editor, not with the public key.
begin;
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
create schema if not exists meridian_private;
revoke all on schema meridian_private from public, anon, authenticated;

create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete set null,
  display_name text not null, role_label text not null default '', email text not null,
  timezone text not null default 'Europe/Paris',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create unique index profiles_single_owner on public.profiles ((true));
create table public.contacts (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references public.profiles(id),
  first_name text not null default '', last_name text not null default '', full_name text not null,
  company text not null default '', role_label text not null default '', email text not null,
  normalized_email text not null, phone text not null default '', notes text not null default '',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(owner_id, normalized_email), check(normalized_email = lower(btrim(email)))
);
create table public.appointments (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references public.profiles(id),
  contact_id uuid not null references public.contacts(id), title text not null default '',
  meeting_type text not null check(meeting_type in ('client','technical','recruitment','partnership','internal')),
  starts_at timestamptz not null, duration_minutes integer not null check(duration_minutes between 15 and 120),
  status text not null check(status in ('pending','confirmed','cancelled','completed')),
  notes text not null default '', guest_details jsonb not null default '{}'::jsonb, origin text not null check(origin in ('public','admin')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index appointments_owner_start on public.appointments(owner_id, starts_at);
create index appointments_contact on public.appointments(contact_id);
create table public.appointment_management_tokens (
  id uuid primary key default gen_random_uuid(), appointment_id uuid not null references public.appointments(id) on delete cascade,
  token_hash text not null unique check(length(token_hash)=64), expires_at timestamptz not null,
  revoked_at timestamptz, created_at timestamptz not null default now()
);
create table public.appointment_events (
  id uuid primary key default gen_random_uuid(), appointment_id uuid not null references public.appointments(id) on delete cascade,
  owner_id uuid not null references public.profiles(id), event_type text not null,
  actor_type text not null, previous_values jsonb, new_values jsonb,
  created_at timestamptz not null default now()
);
create index appointment_events_appointment on public.appointment_events(appointment_id, created_at);
create table public.availability_rules (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references public.profiles(id),
  weekday integer not null check(weekday between 0 and 6), start_local_time time not null,
  end_local_time time not null, enabled boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check(start_local_time < end_local_time), unique(owner_id, weekday)
);
create table public.booking_preferences (
  owner_id uuid primary key references public.profiles(id),
  duration_minutes integer not null default 30 check(duration_minutes between 15 and 120),
  buffer_minutes integer not null default 15 check(buffer_minutes between 0 and 120),
  minimum_notice_hours integer not null default 24 check(minimum_notice_hours between 0 and 168),
  booking_horizon_days integer not null default 60 check(booking_horizon_days between 1 and 365),
  updated_at timestamptz not null default now()
);

-- All seven tables explicitly enable RLS. Browser writes go through guarded RPCs only.
alter table public.profiles enable row level security;
alter table public.contacts enable row level security;
alter table public.appointments enable row level security;
alter table public.appointment_management_tokens enable row level security;
alter table public.appointment_events enable row level security;
alter table public.availability_rules enable row level security;
alter table public.booking_preferences enable row level security;
revoke all on public.profiles, public.contacts, public.appointments, public.appointment_management_tokens,
  public.appointment_events, public.availability_rules, public.booking_preferences from anon, authenticated;
grant select on public.profiles, public.contacts, public.appointments, public.appointment_events,
  public.availability_rules, public.booking_preferences to authenticated;
create policy profile_owner_read on public.profiles for select to authenticated using(auth_user_id = (select auth.uid()));
create policy contacts_owner_read on public.contacts for select to authenticated using(exists(select 1 from public.profiles p where p.id=owner_id and p.auth_user_id=(select auth.uid())));
create policy appointments_owner_read on public.appointments for select to authenticated using(exists(select 1 from public.profiles p where p.id=owner_id and p.auth_user_id=(select auth.uid())));
create policy events_owner_read on public.appointment_events for select to authenticated using(exists(select 1 from public.profiles p where p.id=owner_id and p.auth_user_id=(select auth.uid())));
create policy availability_owner_read on public.availability_rules for select to authenticated using(exists(select 1 from public.profiles p where p.id=owner_id and p.auth_user_id=(select auth.uid())));
create policy preferences_owner_read on public.booking_preferences for select to authenticated using(exists(select 1 from public.profiles p where p.id=owner_id and p.auth_user_id=(select auth.uid())));
create policy tokens_no_browser_access on public.appointment_management_tokens for all to anon, authenticated using(false) with check(false);

create function meridian_private.owner_id() returns uuid language sql stable set search_path='' as $$ select id from public.profiles limit 1 $$;
create function meridian_private.require_owner() returns uuid language plpgsql stable set search_path='' as $$
declare result uuid;
begin
  select id into result from public.profiles where auth_user_id=auth.uid();
  if result is null then raise exception 'Administrator access required.' using errcode='42501'; end if;
  return result;
end $$;
create function meridian_private.token_appointment(p_token text) returns uuid language sql stable set search_path='' as $$
  select appointment_id from public.appointment_management_tokens
  where p_token ~ '^[a-f0-9]{64}$' and token_hash=encode(extensions.digest(p_token,'sha256'),'hex')
    and revoked_at is null and expires_at > now() limit 1
$$;
create function meridian_private.payload(p_id uuid,p_admin boolean default false) returns jsonb language sql stable set search_path='' as $$
  select (to_jsonb(a)-'guest_details') || jsonb_build_object('contact',case when not p_admin then a.guest_details else jsonb_build_object(
    'id',c.id,'full_name',c.full_name,'first_name',c.first_name,'last_name',c.last_name,
    'email',c.email,'phone',c.phone,'company',c.company,'role_label',c.role_label) end,
    'events',coalesce((select jsonb_agg(jsonb_build_object('event_type',e.event_type,'actor_type',e.actor_type,'created_at',e.created_at) order by e.created_at) from public.appointment_events e where e.appointment_id=a.id),'[]'::jsonb))
  from public.appointments a join public.contacts c on c.id=a.contact_id where a.id=p_id
$$;

-- Serializes every appointment write against one owner row. Rechecks after locking:
-- simultaneous requests for overlapping slots cannot both commit.
create function meridian_private.guard_appointment() returns trigger language plpgsql security definer set search_path='' as $$
declare gap integer;
begin
  perform 1 from public.profiles where id=new.owner_id for update;
  if not exists(select 1 from public.contacts where id=new.contact_id and owner_id=new.owner_id) then raise exception 'Invalid contact.'; end if;
  if tg_op='UPDATE' then
    if old.status in ('cancelled','completed') and row(new.starts_at,new.duration_minutes,new.status,new.meeting_type,new.notes,new.contact_id) is distinct from row(old.starts_at,old.duration_minutes,old.status,old.meeting_type,old.notes,old.contact_id) then raise exception 'This appointment is closed.'; end if;
    if new.owner_id<>old.owner_id or new.contact_id<>old.contact_id then raise exception 'Appointment ownership cannot change.'; end if;
    if new.status='completed' and old.status<>'completed' and (old.status<>'confirmed' or old.starts_at+make_interval(mins=>old.duration_minutes)>now()) then raise exception 'Only an ended confirmed meeting can be completed.'; end if;
    if new.status='pending' and old.status<>'pending' and new.starts_at=old.starts_at then raise exception 'Use reschedule to return to pending.'; end if;
  elsif new.status not in ('pending','confirmed') then raise exception 'Invalid initial status.';
  end if;
  if new.status in ('pending','confirmed') then
    select buffer_minutes into gap from public.booking_preferences where owner_id=new.owner_id;
    if exists(select 1 from public.appointments a where a.owner_id=new.owner_id and a.id<>new.id and a.status in ('pending','confirmed')
      and tstzrange(a.starts_at,a.starts_at+make_interval(mins=>a.duration_minutes+gap),'[)') && tstzrange(new.starts_at,new.starts_at+make_interval(mins=>new.duration_minutes+gap),'[)')) then
      raise exception 'This time slot is no longer available.' using errcode='23P01';
    end if;
  end if;
  new.updated_at=now(); return new;
end $$;
create trigger appointment_guard before insert or update on public.appointments for each row execute function meridian_private.guard_appointment();
create function meridian_private.audit_appointment() returns trigger language plpgsql security definer set search_path='' as $$
declare kind text; previous jsonb;
begin
  if tg_op='INSERT' then kind='created'; previous=null;
  else
    if row(new.starts_at,new.duration_minutes,new.status,new.meeting_type,new.notes) is not distinct from row(old.starts_at,old.duration_minutes,old.status,old.meeting_type,old.notes) then return new; end if;
    previous=jsonb_build_object('starts_at',old.starts_at,'duration_minutes',old.duration_minutes,'status',old.status,'meeting_type',old.meeting_type,'notes',old.notes);
    kind=case when new.starts_at<>old.starts_at then 'rescheduled' when new.status<>old.status then new.status else 'edited' end;
  end if;
  insert into public.appointment_events(appointment_id,owner_id,event_type,actor_type,previous_values,new_values)
  values(new.id,new.owner_id,kind,coalesce(nullif(current_setting('meridian.actor',true),''),'server'),previous,
    jsonb_build_object('starts_at',new.starts_at,'duration_minutes',new.duration_minutes,'status',new.status,'meeting_type',new.meeting_type,'notes',new.notes));
  return new;
end $$;
create trigger appointment_audit after insert or update on public.appointments for each row execute function meridian_private.audit_appointment();

create function meridian_private.slots(p_owner uuid,p_duration integer,p_exclude uuid default null)
returns table(starts_at timestamptz) language sql stable set search_path='' as $$
  select candidate from public.profiles o join public.booking_preferences pref on pref.owner_id=o.id
  cross join lateral generate_series((now() at time zone o.timezone)::date::timestamp, ((now() at time zone o.timezone)::date+pref.booking_horizon_days)::timestamp,interval '1 day') as dates(day)
  join public.availability_rules r on r.owner_id=o.id and r.enabled and r.weekday=extract(dow from day)::integer
  cross join lateral generate_series((day::date+r.start_local_time) at time zone o.timezone,
    ((day::date+r.end_local_time) at time zone o.timezone)-make_interval(mins=>p_duration),make_interval(mins=>p_duration+pref.buffer_minutes)) as times(candidate)
  where o.id=p_owner and candidate>=now()+make_interval(hours=>pref.minimum_notice_hours)
    and candidate<=now()+make_interval(days=>pref.booking_horizon_days)
    and not exists(select 1 from public.appointments a where a.owner_id=o.id and a.status in ('pending','confirmed') and (p_exclude is null or a.id<>p_exclude)
      and tstzrange(a.starts_at,a.starts_at+make_interval(mins=>a.duration_minutes+pref.buffer_minutes),'[)') && tstzrange(candidate,candidate+make_interval(mins=>p_duration+pref.buffer_minutes),'[)'))
  order by candidate
$$;

create function public.booking_calendar(p_duration integer default null,p_token text default null,p_exclude_id uuid default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare owner uuid; duration integer; exclude_id uuid; result jsonb;
begin
  owner=meridian_private.owner_id();
  if owner is null then raise exception 'Booking setup is incomplete.'; end if;
  select duration_minutes into duration from public.booking_preferences where owner_id=owner;
  if p_token is not null then
    exclude_id=meridian_private.token_appointment(p_token);
    if exclude_id is null then raise exception 'Management link is invalid or expired.'; end if;
    select duration_minutes into duration from public.appointments where id=exclude_id;
  elsif p_exclude_id is not null then
    perform meridian_private.require_owner();
    select id,duration_minutes into exclude_id,duration from public.appointments where id=p_exclude_id and owner_id=owner;
    if exclude_id is null then raise exception 'Appointment not found.'; end if;
  elsif p_duration is not null then
    if p_duration<>duration then perform meridian_private.require_owner(); duration=p_duration; end if;
  end if;
  if duration not between 15 and 120 then raise exception 'Invalid duration.'; end if;
  select jsonb_build_object('profile',jsonb_build_object('display_name',o.display_name,'role_label',o.role_label,'timezone',o.timezone),
    'preferences',to_jsonb(pref),'rules',(select coalesce(jsonb_agg(to_jsonb(r)),'[]'::jsonb) from public.availability_rules r where r.owner_id=owner),
    'slots',(select coalesce(jsonb_agg(starts_at),'[]'::jsonb) from meridian_private.slots(owner,duration,exclude_id))) into result
  from public.profiles o join public.booking_preferences pref on pref.owner_id=o.id where o.id=owner;
  return result;
end $$;

create function meridian_private.issue_token(p_id uuid) returns text language plpgsql set search_path='' as $$
declare raw text;
begin
  raw=encode(extensions.gen_random_bytes(32),'hex');
  insert into public.appointment_management_tokens(appointment_id,token_hash,expires_at)
  select id,encode(extensions.digest(raw,'sha256'),'hex'),greatest(now()+interval '90 days',starts_at+make_interval(mins=>duration_minutes)+interval '30 days') from public.appointments where id=p_id;
  return raw;
end $$;

create function meridian_private.create_appointment(p_input jsonb,p_admin boolean) returns jsonb language plpgsql set search_path='' as $$
declare owner uuid; contact uuid; appointment uuid; duration integer; start_at timestamptz; raw text; first text; last text; guest_email text; state text;
begin
  owner=case when p_admin then meridian_private.require_owner() else meridian_private.owner_id() end;
  if owner is null then raise exception 'Booking setup is incomplete.'; end if;
  perform 1 from public.profiles where id=owner for update;
  start_at=(p_input->>'starts_at')::timestamptz;
  select duration_minutes into duration from public.booking_preferences where owner_id=owner;
  if p_admin then duration=coalesce((p_input->>'duration_minutes')::integer,duration); end if;
  if start_at is null or start_at<=now() or duration not between 15 and 120 then raise exception 'Choose a future time and valid duration.'; end if;
  if not p_admin and not exists(select 1 from meridian_private.slots(owner,duration) s where s.starts_at=start_at) then raise exception 'This time slot is no longer available.' using errcode='23P01'; end if;
  if coalesce(p_input->>'meeting_type','') not in ('client','technical','recruitment','partnership','internal') then raise exception 'Choose a meeting type.'; end if;
  if length(coalesce(p_input->>'notes',''))>5000 then raise exception 'Note is too long.'; end if;
  if p_admin and p_input->>'contact_id' is not null then
    select id into contact from public.contacts where id=(p_input->>'contact_id')::uuid and owner_id=owner;
    if contact is null then raise exception 'Choose a contact.'; end if;
  else
    first=btrim(coalesce(p_input->>'first_name','')); last=btrim(coalesce(p_input->>'last_name','')); guest_email=lower(btrim(coalesce(p_input->>'email','')));
    if length(first) not between 1 and 100 or length(last) not between 1 and 100 or length(guest_email)>254 or guest_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' or coalesce(p_input->>'phone','') !~ '^[+0-9][0-9 ().-]{6,30}$' or length(coalesce(p_input->>'company',''))>200 then raise exception 'Check your name, email, phone and company.'; end if;
    -- Public callers cannot overwrite an existing contact by guessing its email.
    insert into public.contacts(owner_id,first_name,last_name,full_name,company,email,normalized_email,phone)
    values(owner,first,last,first||' '||last,left(coalesce(p_input->>'company',''),200),guest_email,guest_email,p_input->>'phone')
    on conflict(owner_id,normalized_email) do nothing;
    select id into contact from public.contacts where owner_id=owner and normalized_email=guest_email;
  end if;
  state=case when p_admin then coalesce(p_input->>'status','confirmed') else 'pending' end;
  if state not in ('pending','confirmed') then raise exception 'Invalid initial status.'; end if;
  perform set_config('meridian.actor',case when p_admin then 'admin' else 'client' end,true);
  insert into public.appointments(owner_id,contact_id,meeting_type,starts_at,duration_minutes,status,notes,guest_details,origin)
  values(owner,contact,p_input->>'meeting_type',start_at,duration,state,coalesce(p_input->>'notes',''),
    case when p_admin then (select jsonb_build_object('id',c.id,'full_name',c.full_name,'first_name',c.first_name,'last_name',c.last_name,'email',c.email,'phone',c.phone,'company',c.company,'role_label',c.role_label) from public.contacts c where c.id=contact)
    else jsonb_build_object('id',contact,'full_name',first||' '||last,'first_name',first,'last_name',last,'email',guest_email,'phone',p_input->>'phone','company',coalesce(p_input->>'company',''),'role_label','') end,
    case when p_admin then 'admin' else 'public' end) returning id into appointment;
  raw=meridian_private.issue_token(appointment);
  return jsonb_build_object('appointment',meridian_private.payload(appointment,p_admin),'management_token',raw);
end $$;
create function public.create_booking(p_input jsonb) returns jsonb language sql security definer set search_path='' as $$ select meridian_private.create_appointment(p_input,false) $$;
create function public.admin_create_appointment(p_input jsonb) returns jsonb language sql security definer set search_path='' as $$ select meridian_private.create_appointment(p_input,true) $$;
create function public.get_managed_appointment(p_token text) returns jsonb language sql stable security definer set search_path='' as $$ select meridian_private.payload(meridian_private.token_appointment(p_token)) $$;

create function meridian_private.change_appointment(p_id uuid,p_action text,p_input jsonb,p_admin boolean) returns jsonb language plpgsql set search_path='' as $$
declare a public.appointments; owner uuid; next_start timestamptz; next_duration integer;
begin
  owner=meridian_private.owner_id();
  if p_admin then owner=meridian_private.require_owner(); end if;
  perform 1 from public.profiles where id=owner for update;
  select * into a from public.appointments where id=p_id and owner_id=owner for update;
  if a.id is null then raise exception 'Appointment not found.'; end if;
  if a.status in ('cancelled','completed') then raise exception 'This appointment is closed.'; end if;
  perform set_config('meridian.actor',case when p_admin then 'admin' else 'client' end,true);
  if p_action in ('confirm','cancel','complete') then
    if p_action='complete' and not p_admin then raise exception 'Action not permitted.' using errcode='42501'; end if;
    update public.appointments set status=case p_action when 'confirm' then 'confirmed' when 'cancel' then 'cancelled' else 'completed' end where id=a.id;
  elsif p_action='reschedule' then
    next_start=(p_input->>'starts_at')::timestamptz;
    if not exists(select 1 from meridian_private.slots(owner,a.duration_minutes,a.id) s where s.starts_at=next_start) then raise exception 'This time slot is no longer available.' using errcode='23P01'; end if;
    update public.appointments set starts_at=next_start,status='pending' where id=a.id;
    update public.appointment_management_tokens set expires_at=greatest(expires_at,next_start+interval '30 days') where appointment_id=a.id and revoked_at is null;
  elsif p_action='edit' and p_admin then
    next_duration=(p_input->>'duration_minutes')::integer;
    if next_duration is null or coalesce(p_input->>'meeting_type','') not in ('client','technical','recruitment','partnership','internal') or length(coalesce(p_input->>'notes',''))>5000 then raise exception 'Invalid appointment details.'; end if;
    update public.appointments set duration_minutes=next_duration,meeting_type=p_input->>'meeting_type',notes=coalesce(p_input->>'notes','') where id=a.id;
  else raise exception 'Action not permitted.' using errcode='42501'; end if;
  return meridian_private.payload(a.id,p_admin);
end $$;
create function public.manage_appointment(p_token text,p_action text,p_input jsonb default '{}'::jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare appointment uuid;
begin
  appointment=meridian_private.token_appointment(p_token);
  if appointment is null then raise exception 'Management link is invalid or expired.' using errcode='42501'; end if;
  return meridian_private.change_appointment(appointment,p_action,p_input,false);
end $$;
create function public.admin_change_appointment(p_id uuid,p_action text,p_input jsonb default '{}'::jsonb) returns jsonb language sql security definer set search_path='' as $$ select meridian_private.change_appointment(p_id,p_action,p_input,true) $$;
create function public.admin_issue_management_token(p_id uuid) returns text language plpgsql security definer set search_path='' as $$
declare owner uuid;
begin
  owner=meridian_private.require_owner();
  if not exists(select 1 from public.appointments where id=p_id and owner_id=owner) then raise exception 'Appointment not found.'; end if;
  return meridian_private.issue_token(p_id);
end $$;
create function public.admin_snapshot() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare owner uuid;
begin
  owner=meridian_private.require_owner();
  return jsonb_build_object('profile',(select to_jsonb(p)-'auth_user_id' from public.profiles p where p.id=owner),
    'preferences',(select to_jsonb(p) from public.booking_preferences p where p.owner_id=owner),
    'rules',(select coalesce(jsonb_agg(to_jsonb(r)),'[]'::jsonb) from public.availability_rules r where r.owner_id=owner),
    'contacts',(select coalesce(jsonb_agg(to_jsonb(c) order by c.full_name),'[]'::jsonb) from public.contacts c where c.owner_id=owner),
    'appointments',(select coalesce(jsonb_agg(meridian_private.payload(a.id,true) order by a.starts_at),'[]'::jsonb) from public.appointments a where a.owner_id=owner));
end $$;
create function public.admin_save_settings(p_input jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare owner uuid; day integer; zone text;
begin
  owner=meridian_private.require_owner(); perform 1 from public.profiles where id=owner for update;
  zone=p_input->>'timezone';
  if not exists(select 1 from pg_catalog.pg_timezone_names where name=zone) or length(btrim(coalesce(p_input->>'name',''))) not between 1 and 100 or length(coalesce(p_input->>'role',''))>100 or length(coalesce(p_input->>'email',''))>254 or coalesce(p_input->>'email','') !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' or jsonb_typeof(p_input->'days')<>'array' or jsonb_array_length(p_input->'days')=0 or (p_input->>'start')::time >= (p_input->>'end')::time then raise exception 'Check profile and working hours.'; end if;
  update public.profiles set display_name=btrim(p_input->>'name'),role_label=coalesce(p_input->>'role',''),email=btrim(p_input->>'email'),timezone=zone,updated_at=now() where id=owner;
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

-- PostgreSQL grants EXECUTE to PUBLIC by default: revoke explicitly on every function.
revoke all on all functions in schema meridian_private from public, anon, authenticated;
revoke all on function public.booking_calendar(integer,text,uuid), public.create_booking(jsonb), public.get_managed_appointment(text), public.manage_appointment(text,text,jsonb), public.admin_create_appointment(jsonb), public.admin_change_appointment(uuid,text,jsonb), public.admin_issue_management_token(uuid), public.admin_snapshot(), public.admin_save_settings(jsonb) from public, anon, authenticated;
grant execute on function public.booking_calendar(integer,text,uuid), public.create_booking(jsonb), public.get_managed_appointment(text), public.manage_appointment(text,text,jsonb) to anon, authenticated;
grant execute on function public.admin_create_appointment(jsonb), public.admin_change_appointment(uuid,text,jsonb), public.admin_issue_management_token(uuid), public.admin_snapshot(), public.admin_save_settings(jsonb) to authenticated;

-- One safe public owner, zero fake contacts/appointments. Link Auth separately.
insert into public.profiles(id,display_name,role_label,email,timezone) values('11111111-1111-4111-8111-111111111111','Benoît','CTO','benoit.admin@demo.local','Europe/Paris');
insert into public.booking_preferences(owner_id) values('11111111-1111-4111-8111-111111111111');
insert into public.availability_rules(owner_id,weekday,start_local_time,end_local_time,enabled)
select '11111111-1111-4111-8111-111111111111',d,'09:00'::time,'18:00'::time,d between 1 and 5 from generate_series(0,6) d;
notify pgrst,'reload schema';
commit;
