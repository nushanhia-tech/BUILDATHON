-- =====================================================================
-- Nila — Supabase schema, RLS, triggers, storage and seed data
-- Run the WHOLE file once in Supabase: Dashboard → SQL Editor → New query → paste → Run.
-- It is safe to re-run: it drops Nila's objects first (all app data is reset).
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------- Clean slate (re-runnable) ----------
drop view if exists public.wheelchairs_public cascade;
drop view if exists public.profiles_public cascade;
drop table if exists public.messages, public.reports, public.wheelchair_requests, public.wheelchairs,
  public.helplines, public.quick_phrases, public.sign_cards, public.sos_events, public.checkin_rules,
  public.checkins, public.emergency_info, public.contacts, public.memory_notes, public.tasks,
  public.med_logs, public.medicines, public.activity_log, public.family_links, public.user_settings,
  public.sub_features, public.modules, public.profiles cascade;
drop function if exists public.handle_new_user() cascade;
drop function if exists public.auto_confirm_email() cascade;

-- =====================================================================
-- TABLES
-- =====================================================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  phone text,
  whatsapp boolean not null default true,
  role text not null default 'user' check (role in ('user','family','admin')),
  modes text[] not null default '{}' check (modes <@ array['vision','hearing','mobility','simple']),
  avatar_url text,
  verified boolean not null default false,
  blocked boolean not null default false,
  last_seen timestamptz,
  created_at timestamptz not null default now()
);

create table public.modules (
  id bigint generated always as identity primary key,
  key text not null unique,
  label_ml text not null,
  label_en text not null,
  icon text not null default '⭐',
  color text not null default '#2f6fed',
  default_order int not null default 100,
  enabled_globally boolean not null default true,
  link_url text  -- only for custom_* buttons (URL or phone number)
);

create table public.sub_features (
  id bigint generated always as identity primary key,
  module_key text not null references public.modules(key) on update cascade on delete cascade,
  key text not null unique,
  label_ml text not null,
  label_en text not null,
  enabled_globally boolean not null default true
);

create table public.user_settings (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  enabled_modules text[] not null default array['medicines','tasks','vision','hearing','wheelchair','family_sos'],
  enabled_features text[] not null default array['reminder','history','tasks','where_kept','ocr','objects','light',
    'talk_bridge','sound_alert','sign_cards','find','give','contacts','checkin','sos','emergency_card'],
  module_order text[] not null default array['medicines','tasks','vision','hearing','wheelchair','family_sos'],
  text_size text not null default 'large' check (text_size in ('large','xl')),
  high_contrast boolean not null default false,
  voice_on boolean not null default true,
  voice_rate numeric not null default 0.9 check (voice_rate between 0.5 and 1.5),
  vibration boolean not null default true,
  sound_alert_sensitivity int not null default 60 check (sound_alert_sensitivity between 0 and 100),
  language text not null default 'ml' check (language in ('ml','en')),
  onboarded boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by uuid
);

create table public.family_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  family_id uuid references public.profiles(id) on delete cascade, -- null until a family member claims the code
  level text not null default 'view' check (level in ('view','assist','full')),
  status text not null default 'pending' check (status in ('pending','active','revoked')),
  link_code text not null check (link_code ~ '^[0-9]{6}$'),
  created_at timestamptz not null default now()
);
create index on public.family_links (family_id, status);
create index on public.family_links (user_id, status);

create table public.activity_log (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  changed_by uuid references public.profiles(id) on delete set null,
  action text not null,
  details jsonb,
  created_at timestamptz not null default now()
);
create index on public.activity_log (user_id, created_at desc);

create table public.medicines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  times text[] not null default '{}',
  photo_url text,
  notes text,
  added_by uuid references public.profiles(id) on delete set null,
  needs_confirmation boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.med_logs (
  id uuid primary key default gen_random_uuid(),
  medicine_id uuid not null references public.medicines(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  scheduled_for timestamptz not null,
  taken_at timestamptz default now(),
  unique (medicine_id, scheduled_for)
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  due_at timestamptz,
  done boolean not null default false,
  added_by uuid references public.profiles(id) on delete set null,
  needs_confirmation boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.memory_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  text text not null,
  created_at timestamptz not null default now()
);

create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  relation text,
  phone text not null,
  whatsapp boolean not null default true,
  photo_url text,
  is_sos boolean not null default false,
  added_by uuid references public.profiles(id) on delete set null,
  needs_confirmation boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.emergency_info (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  blood_group text, allergies text, conditions text, doctor_name text, doctor_phone text, note text
);

create table public.checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.checkin_rules (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  deadline_time text not null default '12:00' check (deadline_time ~ '^[0-2][0-9]:[0-5][0-9]$')
);

create table public.sos_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  lat double precision, lng double precision,
  created_at timestamptz not null default now()
);

create table public.sign_cards (
  id uuid primary key default gen_random_uuid(),
  image_url text not null,
  meaning_ml text not null,
  meaning_en text not null,
  category text not null default 'general',
  created_by uuid references public.profiles(id) on delete set null
);

create table public.quick_phrases (
  id uuid primary key default gen_random_uuid(),
  text_ml text not null,
  text_en text,
  icon text,
  user_id uuid references public.profiles(id) on delete cascade, -- null = global (admin)
  created_at timestamptz not null default now()
);

create table public.helplines (
  id uuid primary key default gen_random_uuid(),
  name_ml text not null,
  name_en text,
  phone text not null,
  category text
);

create table public.wheelchairs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  photo_urls text[] not null default '{}',
  type text not null check (type in ('manual','foldable','electric','commode','walker','crutches','hospital_bed')),
  condition text not null check (condition in ('like_new','good','usable')),
  offer text not null check (offer in ('free_lend','rent','donate')),
  rent_per_day int check (rent_per_day is null or rent_per_day >= 0),
  duration text not null default 'any' check (duration in ('1w','1m','any')),
  lat double precision not null, lng double precision not null,
  public_lat double precision, public_lng double precision,
  place_name text,
  delivery boolean not null default false,
  status text not null default 'available' check (status in ('available','requested','in_use')),
  approved boolean not null default false,
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.wheelchair_requests (
  id uuid primary key default gen_random_uuid(),
  wheelchair_id uuid not null references public.wheelchairs(id) on delete cascade,
  seeker_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null check (reason in ('surgery','elderly','disability','palliative','other')),
  days_needed int not null default 7 check (days_needed between 1 and 365),
  message text,
  status text not null default 'pending' check (status in ('pending','accepted','declined','returned','cancelled')),
  return_date date,
  created_at timestamptz not null default now()
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  item_type text not null,
  item_id uuid not null,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null,
  status text not null default 'open' check (status in ('open','warned','removed','blocked','dismissed')),
  created_at timestamptz not null default now()
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  from_id uuid not null references public.profiles(id) on delete cascade,
  to_id uuid not null references public.profiles(id) on delete cascade,
  text text,
  audio_url text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

-- =====================================================================
-- HELPER FUNCTIONS (security definer → no RLS recursion)
-- =====================================================================
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin' and not blocked);
$$;

-- Active link level the caller has over `target` ('view'|'assist'|'full') or null.
create or replace function public.family_level(target uuid) returns text
language sql stable security definer set search_path = public as $$
  select case max(case level when 'full' then 3 when 'assist' then 2 else 1 end)
           when 3 then 'full' when 2 then 'assist' when 1 then 'view' end
  from family_links
  where user_id = target and family_id = auth.uid() and status = 'active';
$$;

create or replace function public.can_view(target uuid) returns boolean
language sql stable as $$ select target = auth.uid() or public.family_level(target) is not null; $$;
create or replace function public.can_assist(target uuid) returns boolean
language sql stable as $$ select target = auth.uid() or public.family_level(target) in ('assist','full'); $$;
create or replace function public.can_full(target uuid) returns boolean
language sql stable as $$ select target = auth.uid() or public.family_level(target) = 'full'; $$;

-- True when the two accounts are linked (any direction, active).
create or replace function public.are_linked(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from family_links where status = 'active'
    and ((user_id = a and family_id = b) or (user_id = b and family_id = a)));
$$;

create or replace function public.is_wc_owner(wc uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from wheelchairs where id = wc and owner_id = auth.uid());
$$;

create or replace function public.wc_requestable(wc uuid, seeker uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from wheelchairs where id = wc and approved and owner_id <> seeker);
$$;

-- =====================================================================
-- TRIGGERS
-- =====================================================================
-- New auth user → profile + default settings. Role comes from signup metadata,
-- but only 'user' or 'family' (admin is assigned manually in the DB).
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare r text := coalesce(new.raw_user_meta_data->>'role', 'user');
begin
  if r not in ('user','family') then r := 'user'; end if;
  insert into profiles (id, name, phone, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
          new.raw_user_meta_data->>'phone', r)
  on conflict (id) do nothing;
  insert into user_settings (user_id) values (new.id) on conflict do nothing;
  insert into checkin_rules (user_id) values (new.id) on conflict do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- No email verification: new accounts are confirmed at creation so they can log in immediately.
-- (Also turn off "Confirm email" in Authentication → Providers → Email so no mail is sent.)
create or replace function public.auto_confirm_email() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.email_confirmed_at is null then new.email_confirmed_at := now(); end if;
  return new;
end $$;
drop trigger if exists auto_confirm_email on auth.users;
create trigger auto_confirm_email before insert on auth.users
  for each row execute function public.auto_confirm_email();

-- Users cannot promote themselves, verify themselves or unblock themselves.
create or replace function public.protect_profile() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or public.is_admin() then return new; end if;
  if new.role is distinct from old.role or new.verified is distinct from old.verified
     or new.blocked is distinct from old.blocked then
    raise exception 'not allowed to change role/verified/blocked';
  end if;
  return new;
end $$;
create trigger profiles_protect before update on public.profiles
  for each row execute function public.protect_profile();

-- Family writes: stamp added_by, force needs_confirmation for 'assist' level.
create or replace function public.stamp_family_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and auth.uid() <> new.user_id then
    new.added_by := auth.uid();
    new.needs_confirmation := coalesce(public.family_level(new.user_id), 'view') <> 'full';
  elsif auth.uid() = new.user_id then
    new.added_by := coalesce(new.added_by, auth.uid());
  end if;
  return new;
end $$;
create trigger medicines_stamp before insert on public.medicines for each row execute function public.stamp_family_insert();
create trigger tasks_stamp before insert on public.tasks for each row execute function public.stamp_family_insert();
create trigger contacts_stamp before insert on public.contacts for each row execute function public.stamp_family_insert();

-- Only the user can clear needs_confirmation on their own rows.
create or replace function public.guard_confirmation() returns trigger
language plpgsql as $$
begin
  if old.needs_confirmation and not new.needs_confirmation and auth.uid() is distinct from new.user_id then
    new.needs_confirmation := true;
  end if;
  return new;
end $$;
create trigger medicines_confirm before update on public.medicines for each row execute function public.guard_confirmation();
create trigger tasks_confirm before update on public.tasks for each row execute function public.guard_confirmation();
create trigger contacts_confirm before update on public.contacts for each row execute function public.guard_confirmation();

-- Activity log: every change made on a user's data by someone else (family) is logged.
create or replace function public.log_family_change() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  row_data jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  target uuid := (row_data->>'user_id')::uuid;
  summary jsonb;
begin
  if auth.uid() is null or target is null or auth.uid() = target then return null; end if;
  summary := jsonb_build_object('table', tg_table_name,
    'name', coalesce(row_data->>'name', row_data->>'title', row_data->>'text_ml', row_data->>'text'));
  if tg_table_name = 'user_settings' and tg_op = 'UPDATE' then
    summary := summary || jsonb_build_object(
      'added_modules', (select coalesce(jsonb_agg(m), '[]') from unnest(new.enabled_modules) m where not m = any(old.enabled_modules)),
      'removed_modules', (select coalesce(jsonb_agg(m), '[]') from unnest(old.enabled_modules) m where not m = any(new.enabled_modules)));
  end if;
  insert into activity_log (user_id, changed_by, action, details)
  values (target, auth.uid(), lower(tg_op) || ':' || tg_table_name, summary);
  return null;
end $$;

do $$ declare t text; begin
  foreach t in array array['medicines','med_logs','tasks','memory_notes','contacts','emergency_info',
    'checkin_rules','user_settings','quick_phrases','wheelchair_requests'] loop
    execute format('create trigger %I_log after insert or update or delete on public.%I
      for each row execute function public.log_family_change()', t, t);
  end loop;
end $$;

-- Family link changes are logged too (consent trail).
create or replace function public.log_link_change() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'UPDATE' and (new.status is distinct from old.status or new.level is distinct from old.level
      or new.family_id is distinct from old.family_id) then
    insert into activity_log (user_id, changed_by, action, details)
    values (new.user_id, auth.uid(), 'link:' || new.status,
      jsonb_build_object('family_id', new.family_id, 'level', new.level, 'old_level', old.level));
  end if;
  return null;
end $$;
create trigger family_links_log after update on public.family_links for each row execute function public.log_link_change();

-- Family members may only revoke their own link; level/status changes otherwise belong to the user.
create or replace function public.guard_family_link() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or auth.uid() = old.user_id then return new; end if;
  -- claim_link_code(): a family member attaches themselves to an unclaimed pending code
  if old.family_id is null and new.family_id = auth.uid() and new.status = 'pending'
     and new.level = old.level and new.user_id = old.user_id then
    return new;
  end if;
  if auth.uid() = old.family_id then
    if new.status = 'revoked' and new.level = old.level and new.user_id = old.user_id and new.family_id = old.family_id then
      return new;
    end if;
    raise exception 'only the user can change the access level';
  end if;
  raise exception 'not allowed';
end $$;
create trigger family_links_guard before update on public.family_links for each row execute function public.guard_family_link();

-- Wheelchairs: fuzzed public location (200–500 m), approval only by admin.
create or replace function public.wheelchair_before_write() returns trigger
language plpgsql security definer set search_path = public as $$
declare dist double precision; ang double precision;
begin
  if tg_op = 'INSERT' or new.lat is distinct from old.lat or new.lng is distinct from old.lng or new.public_lat is null then
    dist := 200 + random() * 300;
    ang := random() * 2 * pi();
    new.public_lat := new.lat + (dist * cos(ang)) / 111320.0;
    new.public_lng := new.lng + (dist * sin(ang)) / (111320.0 * cos(radians(new.lat)));
  end if;
  if not public.is_admin() and auth.uid() is not null then
    if tg_op = 'INSERT' then new.approved := false;
    else new.approved := old.approved; end if;
  end if;
  return new;
end $$;
create trigger wheelchairs_bw before insert or update on public.wheelchairs for each row execute function public.wheelchair_before_write();

-- Requests drive the wheelchair status (seeker can't update the wheelchair row directly).
create or replace function public.wheelchair_request_sync() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update wheelchairs set status = 'requested' where id = new.wheelchair_id and status = 'available';
  elsif new.status is distinct from old.status then
    if new.status = 'accepted' then
      update wheelchairs set status = 'in_use' where id = new.wheelchair_id;
    elsif new.status in ('returned') then
      update wheelchairs set status = 'available' where id = new.wheelchair_id;
    elsif new.status in ('declined','cancelled') then
      update wheelchairs w set status = 'available' where w.id = new.wheelchair_id and w.status = 'requested'
        and not exists (select 1 from wheelchair_requests r where r.wheelchair_id = w.id and r.status = 'pending' and r.id <> new.id);
    end if;
  end if;
  return null;
end $$;
create trigger wheelchair_requests_sync after insert or update on public.wheelchair_requests
  for each row execute function public.wheelchair_request_sync();

-- Who may change a request: owner (accept/decline/returned/return_date), seeker side (cancel only).
create or replace function public.guard_wheelchair_request() returns trigger
language plpgsql security definer set search_path = public as $$
declare owner uuid;
begin
  if new.status = 'accepted' and old.status <> 'accepted' and new.return_date is null then
    new.return_date := current_date + new.days_needed;
  end if;
  if auth.uid() is null or public.is_admin() then return new; end if;
  select owner_id into owner from wheelchairs where id = new.wheelchair_id;
  if auth.uid() = owner then return new; end if;
  if public.can_full(old.seeker_id) and new.status = 'cancelled' and old.status = 'pending' then return new; end if;
  raise exception 'not allowed to change this request';
end $$;
create trigger wheelchair_requests_guard before update on public.wheelchair_requests
  for each row execute function public.guard_wheelchair_request();

-- =====================================================================
-- RPC FUNCTIONS
-- =====================================================================
-- User creates a 6-digit link code (valid 15 min).
create or replace function public.create_link_code() returns text
language plpgsql security definer set search_path = public as $$
declare c text;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  delete from family_links where user_id = auth.uid() and family_id is null;
  loop
    c := lpad((floor(random() * 1000000))::int::text, 6, '0');
    exit when not exists (select 1 from family_links where link_code = c and family_id is null);
  end loop;
  insert into family_links (user_id, link_code, status) values (auth.uid(), c, 'pending');
  return c;
end $$;

-- Family member claims a code → pending link the user must approve.
create or replace function public.claim_link_code(code text) returns uuid
language plpgsql security definer set search_path = public as $$
declare l family_links;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  select * into l from family_links
   where link_code = code and family_id is null and status = 'pending'
     and created_at > now() - interval '15 minutes'
   order by created_at desc limit 1;
  if l.id is null then return null; end if;
  if l.user_id = auth.uid() then return null; end if;
  update family_links set status = 'revoked'
   where user_id = l.user_id and family_id = auth.uid() and status in ('pending','active');
  update family_links set family_id = auth.uid() where id = l.id;
  return l.id;
end $$;

-- After a request is accepted, reveal the counterpart's phone (and exact location for the seeker).
create or replace function public.get_request_contact(req uuid)
returns table (phone text, whatsapp boolean, lat double precision, lng double precision, name text)
language plpgsql security definer set search_path = public as $$
declare r wheelchair_requests; w wheelchairs;
begin
  select * into r from wheelchair_requests where id = req;
  if r.id is null or r.status not in ('accepted','returned') then return; end if;
  select * into w from wheelchairs where id = r.wheelchair_id;
  if public.can_view(r.seeker_id) then
    return query select p.phone, p.whatsapp, w.lat, w.lng, p.name from profiles p where p.id = w.owner_id;
  elsif auth.uid() = w.owner_id then
    return query select p.phone, p.whatsapp, null::double precision, null::double precision, p.name from profiles p where p.id = r.seeker_id;
  end if;
end $$;

-- Admin dashboard statistics (aggregates only — no medical data).
create or replace function public.admin_stats() returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'admin only'; end if;
  return jsonb_build_object(
    'users', (select count(*) from profiles where role = 'user'),
    'family', (select count(*) from profiles where role = 'family'),
    'by_mode', (select coalesce(jsonb_object_agg(m, c), '{}') from (
        select unnest(modes) m, count(*) c from profiles where role = 'user' group by 1) x),
    'wc_available', (select count(*) from wheelchairs where approved and status = 'available'),
    'wc_in_use', (select count(*) from wheelchairs where approved and status = 'in_use'),
    'wc_pending', (select count(*) from wheelchairs where not approved),
    'requests_today', (select count(*) from wheelchair_requests where created_at::date = current_date),
    'sos_today', (select count(*) from sos_events where created_at::date = current_date),
    'open_reports', (select count(*) from reports where status = 'open'),
    'module_usage', (select coalesce(jsonb_object_agg(k, c), '{}') from (
        select unnest(s.enabled_modules) k, count(*) c from user_settings s
        join profiles p on p.id = s.user_id and p.role = 'user' group by 1) y)
  );
end $$;

-- Admin: requests for one wheelchair (history), with seeker names only.
create or replace function public.admin_wheelchair_history(wc uuid)
returns table (id uuid, seeker_name text, reason text, days_needed int, status text, return_date date, created_at timestamptz)
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'admin only'; end if;
  return query select r.id, p.name, r.reason, r.days_needed, r.status, r.return_date, r.created_at
    from wheelchair_requests r join profiles p on p.id = r.seeker_id
    where r.wheelchair_id = wc order by r.created_at desc;
end $$;

-- =====================================================================
-- VIEWS (public fields only; run with owner rights on purpose)
-- =====================================================================
create view public.profiles_public as
  select id, name, avatar_url, verified, role from public.profiles;

create view public.wheelchairs_public as
  select w.id, w.owner_id, p.name as owner_name, p.verified as owner_verified, w.photo_urls, w.type,
         w.condition, w.offer, w.rent_per_day, w.duration, w.public_lat, w.public_lng, w.place_name,
         w.delivery, w.status, w.is_demo, w.created_at
  from public.wheelchairs w join public.profiles p on p.id = w.owner_id
  where w.approved and not p.blocked;

revoke all on public.profiles_public, public.wheelchairs_public from anon;
grant select on public.profiles_public, public.wheelchairs_public to authenticated;

-- =====================================================================
-- ROW LEVEL SECURITY
-- =====================================================================
alter table public.profiles enable row level security;
alter table public.modules enable row level security;
alter table public.sub_features enable row level security;
alter table public.user_settings enable row level security;
alter table public.family_links enable row level security;
alter table public.activity_log enable row level security;
alter table public.medicines enable row level security;
alter table public.med_logs enable row level security;
alter table public.tasks enable row level security;
alter table public.memory_notes enable row level security;
alter table public.contacts enable row level security;
alter table public.emergency_info enable row level security;
alter table public.checkins enable row level security;
alter table public.checkin_rules enable row level security;
alter table public.sos_events enable row level security;
alter table public.sign_cards enable row level security;
alter table public.quick_phrases enable row level security;
alter table public.helplines enable row level security;
alter table public.wheelchairs enable row level security;
alter table public.wheelchair_requests enable row level security;
alter table public.reports enable row level security;
alter table public.messages enable row level security;

-- profiles: self, linked family (both ways), admin
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin() or public.are_linked(id, auth.uid()));
create policy profiles_update_self on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
create policy profiles_update_admin on public.profiles for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- global catalogue: everyone signed in reads; admin writes
create policy modules_read on public.modules for select to authenticated using (true);
create policy modules_admin on public.modules for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy sub_features_read on public.sub_features for select to authenticated using (true);
create policy sub_features_admin on public.sub_features for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy sign_cards_read on public.sign_cards for select to authenticated using (true);
create policy sign_cards_admin on public.sign_cards for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy helplines_read on public.helplines for select to authenticated using (true);
create policy helplines_admin on public.helplines for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- quick phrases: global (user_id null) readable by all, admin manages; personal ones by user / assist+full family
create policy qp_read on public.quick_phrases for select to authenticated
  using (user_id is null or public.can_view(user_id));
create policy qp_admin on public.quick_phrases for all to authenticated
  using (user_id is null and public.is_admin()) with check (user_id is null and public.is_admin());
create policy qp_personal on public.quick_phrases for all to authenticated
  using (user_id is not null and public.can_assist(user_id)) with check (user_id is not null and public.can_assist(user_id));

-- user_settings: view+ can read, full can update
create policy us_select on public.user_settings for select to authenticated using (public.can_view(user_id));
create policy us_insert on public.user_settings for insert to authenticated with check (user_id = auth.uid());
create policy us_update on public.user_settings for update to authenticated using (public.can_full(user_id)) with check (public.can_full(user_id));

-- family_links
create policy fl_select on public.family_links for select to authenticated
  using (user_id = auth.uid() or family_id = auth.uid());
create policy fl_update on public.family_links for update to authenticated
  using (user_id = auth.uid() or family_id = auth.uid());
create policy fl_delete on public.family_links for delete to authenticated using (user_id = auth.uid());

-- activity_log: the user and their linked family can read it (inserts come from triggers)
create policy al_select on public.activity_log for select to authenticated using (public.can_view(user_id));
create policy al_insert_self on public.activity_log for insert to authenticated
  with check (changed_by = auth.uid() and public.can_view(user_id));

-- medicines / tasks: view reads, assist inserts (confirmation forced by trigger), full updates/deletes
create policy med_select on public.medicines for select to authenticated using (public.can_view(user_id));
create policy med_insert on public.medicines for insert to authenticated with check (public.can_assist(user_id));
create policy med_update on public.medicines for update to authenticated using (public.can_full(user_id)) with check (public.can_full(user_id));
create policy med_delete on public.medicines for delete to authenticated using (public.can_full(user_id));

create policy medlog_select on public.med_logs for select to authenticated using (public.can_view(user_id));
create policy medlog_write on public.med_logs for insert to authenticated with check (public.can_full(user_id));
create policy medlog_update on public.med_logs for update to authenticated using (public.can_full(user_id));
create policy medlog_delete on public.med_logs for delete to authenticated using (public.can_full(user_id));

create policy tasks_select on public.tasks for select to authenticated using (public.can_view(user_id));
create policy tasks_insert on public.tasks for insert to authenticated with check (public.can_assist(user_id));
create policy tasks_update on public.tasks for update to authenticated using (public.can_full(user_id)) with check (public.can_full(user_id));
create policy tasks_delete on public.tasks for delete to authenticated using (public.can_full(user_id));

-- contacts: assist reads + inserts, full manages
create policy contacts_select on public.contacts for select to authenticated using (public.can_assist(user_id));
create policy contacts_insert on public.contacts for insert to authenticated with check (public.can_assist(user_id));
create policy contacts_update on public.contacts for update to authenticated using (public.can_full(user_id)) with check (public.can_full(user_id));
create policy contacts_delete on public.contacts for delete to authenticated using (public.can_full(user_id));

-- full-only function data
create policy notes_all on public.memory_notes for all to authenticated using (public.can_full(user_id)) with check (public.can_full(user_id));
create policy emerg_select on public.emergency_info for select to authenticated using (public.can_assist(user_id));
create policy emerg_write on public.emergency_info for all to authenticated using (public.can_full(user_id)) with check (public.can_full(user_id));
create policy rules_select on public.checkin_rules for select to authenticated using (public.can_view(user_id));
create policy rules_write on public.checkin_rules for all to authenticated using (public.can_full(user_id)) with check (public.can_full(user_id));

-- checkins & SOS: the user creates their own, family (view+) reads
create policy checkins_select on public.checkins for select to authenticated using (public.can_view(user_id));
create policy checkins_insert on public.checkins for insert to authenticated with check (user_id = auth.uid());
create policy sos_select on public.sos_events for select to authenticated using (public.can_view(user_id));
create policy sos_insert on public.sos_events for insert to authenticated with check (user_id = auth.uid());

-- wheelchairs: base table only for owner/admin (others use wheelchairs_public)
create policy wc_owner_select on public.wheelchairs for select to authenticated using (owner_id = auth.uid() or public.is_admin());
create policy wc_owner_insert on public.wheelchairs for insert to authenticated with check (owner_id = auth.uid() or public.is_admin());
create policy wc_owner_update on public.wheelchairs for update to authenticated using (owner_id = auth.uid() or public.is_admin());
create policy wc_owner_delete on public.wheelchairs for delete to authenticated using (owner_id = auth.uid() or public.is_admin());

-- wheelchair requests: seeker (or seeker's family), owner
create policy wcr_select on public.wheelchair_requests for select to authenticated
  using (public.can_view(seeker_id) or public.is_wc_owner(wheelchair_id));
create policy wcr_insert on public.wheelchair_requests for insert to authenticated
  with check (public.can_full(seeker_id) and public.wc_requestable(wheelchair_id, seeker_id));
create policy wcr_update on public.wheelchair_requests for update to authenticated
  using (public.can_full(seeker_id) or public.is_wc_owner(wheelchair_id));

-- reports
create policy reports_insert on public.reports for insert to authenticated with check (reporter_id = auth.uid());
create policy reports_admin on public.reports for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- messages: between linked accounts only
create policy msg_select on public.messages for select to authenticated using (from_id = auth.uid() or to_id = auth.uid());
create policy msg_insert on public.messages for insert to authenticated
  with check (from_id = auth.uid() and public.are_linked(from_id, to_id));
create policy msg_update on public.messages for update to authenticated using (to_id = auth.uid());

-- =====================================================================
-- REALTIME
-- =====================================================================
do $$ declare t text; begin
  foreach t in array array['user_settings','modules','sub_features','family_links','sos_events','checkins',
    'med_logs','medicines','tasks','messages','wheelchair_requests','activity_log','contacts'] loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then null; when undefined_object then
      raise notice 'publication supabase_realtime missing — enable Realtime in the dashboard';
    end;
  end loop;
end $$;

-- =====================================================================
-- STORAGE: public "photos" bucket (public read, authenticated write to own folder)
-- =====================================================================
insert into storage.buckets (id, name, public) values ('photos', 'photos', true)
  on conflict (id) do update set public = true;

drop policy if exists "photos public read" on storage.objects;
drop policy if exists "photos auth upload" on storage.objects;
drop policy if exists "photos owner update" on storage.objects;
drop policy if exists "photos owner delete" on storage.objects;
create policy "photos public read" on storage.objects for select using (bucket_id = 'photos');
create policy "photos auth upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "photos owner update" on storage.objects for update to authenticated
  using (bucket_id = 'photos' and owner = auth.uid());
create policy "photos owner delete" on storage.objects for delete to authenticated
  using (bucket_id = 'photos' and owner = auth.uid());

-- =====================================================================
-- SEED: modules & sub-features
-- =====================================================================
insert into public.modules (key, label_ml, label_en, icon, color, default_order) values
  ('medicines',  'മരുന്നുകൾ',        'Medicines',       '💊', '#2f6fed', 1),
  ('tasks',      'കാര്യങ്ങൾ',         'Tasks & memory',  '📋', '#7c3aed', 2),
  ('vision',     'കണ്ണ് സഹായി',      'Eye helper',      '👁️', '#0891b2', 3),
  ('hearing',    'ചെവി സഹായി',       'Ear helper',      '🦻', '#db2777', 4),
  ('wheelchair', 'വീൽചെയർ',          'Wheelchair',      '♿', '#059669', 5),
  ('family_sos', 'കുടുംബം / SOS',    'Family & SOS',    '🆘', '#dc2626', 6);

insert into public.sub_features (module_key, key, label_ml, label_en) values
  ('medicines',  'reminder',       'ഓർമ്മപ്പെടുത്തൽ',       'Reminders'),
  ('medicines',  'history',        '7 ദിവസ ചരിത്രം',          '7-day history'),
  ('tasks',      'tasks',          'ചെയ്യാനുള്ളവ',             'Tasks'),
  ('tasks',      'where_kept',     'ഞാൻ എവിടെ വെച്ചു?',       'Where did I keep it?'),
  ('vision',     'ocr',            'വായിച്ചുതരൂ (OCR)',        'Read text (OCR)'),
  ('vision',     'objects',        'മുന്നിൽ എന്ത്?',           'What''s in front?'),
  ('vision',     'light',          'വെളിച്ചം അറിയാൻ',        'Light detector'),
  ('hearing',    'talk_bridge',    'സംസാര പാലം',              'Talk bridge'),
  ('hearing',    'sound_alert',    'ശബ്ദ അലേർട്ട്',            'Sound alert'),
  ('hearing',    'sign_cards',     'ആംഗ്യ കാർഡുകൾ',           'Sign cards'),
  ('wheelchair', 'find',           'കണ്ടെത്തൂ',                'Find'),
  ('wheelchair', 'give',           'നൽകൂ',                     'Give'),
  ('family_sos', 'contacts',       'കോൺടാക്റ്റുകൾ',          'Contacts'),
  ('family_sos', 'checkin',        'ഞാൻ സുഖമാണ്',             'Daily check-in'),
  ('family_sos', 'sos',            'SOS',                       'SOS'),
  ('family_sos', 'emergency_card', 'അടിയന്തര കാർഡ്',         'Emergency card');

-- =====================================================================
-- SEED: content
-- (Sign images are placeholders in /public/signs — replace with real ISL photos.)
-- =====================================================================
insert into public.sign_cards (image_url, meaning_ml, meaning_en, category) values
  ('/signs/01-namaskaram.svg', 'നമസ്കാരം', 'Hello',        'greetings'),
  ('/signs/02-nanni.svg',      'നന്ദി',     'Thank you',    'greetings'),
  ('/signs/03-vellam.svg',     'വെള്ളം',    'Water',        'needs'),
  ('/signs/04-bhakshanam.svg', 'ഭക്ഷണം',   'Food',         'needs'),
  ('/signs/05-sahayam.svg',    'സഹായം',     'Help',         'emergency'),
  ('/signs/06-vedana.svg',     'വേദന',      'Pain',         'health'),
  ('/signs/07-doctor.svg',     'ഡോക്ടർ',    'Doctor',       'health'),
  ('/signs/08-marunnu.svg',    'മരുന്ന്',   'Medicine',     'health'),
  ('/signs/09-amma.svg',       'അമ്മ',      'Mother',       'family'),
  ('/signs/10-achan.svg',      'അച്ഛൻ',     'Father',       'family'),
  ('/signs/11-veedu.svg',      'വീട്',       'Home',         'places'),
  ('/signs/12-suchimuri.svg',  'ശുചിമുറി',  'Toilet',       'needs'),
  ('/signs/13-urakkam.svg',    'ഉറക്കം',    'Sleep',        'needs'),
  ('/signs/14-athe.svg',       'അതെ',       'Yes',          'basic'),
  ('/signs/15-alla.svg',       'അല്ല',      'No',           'basic'),
  ('/signs/16-nilkku.svg',     'നിൽക്കൂ',   'Stop / Wait',  'basic'),
  ('/signs/17-varu.svg',       'വരൂ',       'Come',         'basic'),
  ('/signs/18-poku.svg',       'പോകൂ',      'Go',           'basic'),
  ('/signs/19-santhosham.svg', 'സന്തോഷം',   'Happy',        'feelings'),
  ('/signs/20-kshamikkanam.svg','ക്ഷമിക്കണം','Sorry',        'feelings');

insert into public.quick_phrases (text_ml, text_en, icon) values
  ('വെള്ളം വേണം',          'I need water',           '💧'),
  ('ഒന്നുകൂടി പറയൂ',        'Please say it again',    '🔁'),
  ('എനിക്ക് കേൾക്കില്ല',     'I cannot hear',          '🦻'),
  ('പതുക്കെ പറയൂ',          'Please speak slowly',    '🐢'),
  ('എഴുതി കാണിക്കൂ',        'Please write it down',   '✍️'),
  ('സഹായിക്കൂ',             'Please help me',         '🙏'),
  ('ഡോക്ടറെ വിളിക്കൂ',       'Call the doctor',        '🩺'),
  ('നന്ദി',                  'Thank you',              '😊'),
  ('എനിക്ക് വേദനയുണ്ട്',     'I am in pain',           '🤕'),
  ('ശുചിമുറി എവിടെ?',       'Where is the toilet?',   '🚻');

insert into public.helplines (name_ml, name_en, phone, category) values
  ('ആംബുലൻസ്',          'Ambulance',       '108',   'emergency'),
  ('പോലീസ് / അടിയന്തരം', 'Police / Emergency', '112', 'emergency'),
  ('വയോജന ഹെൽപ്‌ലൈൻ',    'Elder helpline',  '14567', 'elderly');

-- =====================================================================
-- SEED: demo accounts (password for all: NilaDemo@123)
--   admin@nila.demo  — admin (also owns the DEMO wheelchair listings as "Nila Demo Org")
--   user@nila.demo   — Ummah, Simple Mode
--   family@nila.demo — Abdul (son), linked to user@ with level 'full'
-- =====================================================================
delete from auth.users where email in ('admin@nila.demo', 'user@nila.demo', 'family@nila.demo');

do $$
declare
  v_admin uuid := gen_random_uuid();
  v_user uuid := gen_random_uuid();
  v_fam uuid := gen_random_uuid();
  rec record;
begin
  for rec in select * from (values
      (v_admin, 'admin@nila.demo',  'Nila Demo Org (ഡെമോ)', 'family'),
      (v_user,  'user@nila.demo',   'ഉമ്മ (Ummah)',          'user'),
      (v_fam,   'family@nila.demo', 'അബ്ദുൾ (Abdul)',        'family')) as v(id, email, name, role)
  loop
    insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change)
    values ('00000000-0000-0000-0000-000000000000', rec.id, 'authenticated', 'authenticated', rec.email,
      crypt('NilaDemo@123', gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}', jsonb_build_object('name', rec.name, 'role', rec.role),
      now(), now(), '', '', '', '');
    insert into auth.identities (id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (gen_random_uuid(), rec.id::text, rec.id,
      jsonb_build_object('sub', rec.id::text, 'email', rec.email, 'email_verified', true),
      'email', now(), now(), now());
  end loop;

  update public.profiles set role = 'admin', verified = true, phone = '9000000000' where id = v_admin;
  update public.profiles set modes = array['simple'], phone = '9000000001' where id = v_user;
  update public.profiles set phone = '9000000002' where id = v_fam;
  update public.user_settings set onboarded = true,
    enabled_modules = array['medicines','tasks','family_sos','hearing'],
    module_order = array['medicines','family_sos','tasks','hearing','vision','wheelchair']
    where user_settings.user_id = v_user;

  insert into public.family_links (user_id, family_id, level, status, link_code)
    values (v_user, v_fam, 'full', 'active', '000000');

  insert into public.medicines (user_id, name, times, notes, added_by) values
    (v_user, 'BP ഗുളിക (Amlodipine)', array['08:00','21:00'], 'ഭക്ഷണത്തിന് ശേഷം', v_user),
    (v_user, 'ഷുഗർ ഗുളിക (Metformin)', array['08:00','14:00','21:00'], null, v_user);
  insert into public.tasks (user_id, title, due_at, added_by) values
    (v_user, 'ഡോക്ടറെ കാണണം', (current_date + 1) + time '10:00', v_user),
    (v_user, 'പെൻഷൻ വാങ്ങണം', current_date + time '15:00', v_user);
  insert into public.memory_notes (user_id, text) values (v_user, 'കണ്ണട അലമാരയുടെ മുകളിൽ വെച്ചു');
  insert into public.contacts (user_id, name, relation, phone, is_sos, added_by) values
    (v_user, 'അബ്ദുൾ', 'മകൻ', '9000000002', true, v_user),
    (v_user, 'ഡോ. മേരി', 'ഡോക്ടർ', '9000000003', false, v_user);
  insert into public.emergency_info (user_id, blood_group, allergies, conditions, doctor_name, doctor_phone, note)
    values (v_user, 'B+', 'പെൻസിലിൻ', 'BP, ഷുഗർ', 'ഡോ. മേരി', '9000000003', 'എനിക്ക് പതുക്കെ കേൾക്കൂ');

  -- 10 DEMO wheelchairs around Pattambi (owned by the demo org). Clearly flagged is_demo = true.
  insert into public.wheelchairs (owner_id, type, condition, offer, rent_per_day, duration, lat, lng, place_name, delivery, status, approved, is_demo) values
    (v_admin, 'manual',       'good',     'free_lend', null, '1m',  10.8105, 76.1937, 'പട്ടാമ്പി ടൗൺ (DEMO)',     true,  'available', true, true),
    (v_admin, 'foldable',     'like_new', 'rent',      50,   '1w',  10.8241, 76.1802, 'കൊപ്പം (DEMO)',          false, 'available', true, true),
    (v_admin, 'electric',     'good',     'rent',      200,  '1m',  10.7952, 76.2105, 'ഓങ്ങല്ലൂർ (DEMO)',        true,  'available', true, true),
    (v_admin, 'commode',      'usable',   'donate',    null, 'any', 10.8350, 76.2010, 'വല്ലപ്പുഴ (DEMO)',        false, 'available', true, true),
    (v_admin, 'walker',       'good',     'free_lend', null, '1w',  10.8012, 76.1702, 'തൃത്താല റോഡ് (DEMO)',   false, 'requested', true, true),
    (v_admin, 'crutches',     'like_new', 'free_lend', null, '1m',  10.7856, 76.1899, 'മുതുതല (DEMO)',          true,  'available', true, true),
    (v_admin, 'hospital_bed', 'good',     'rent',      150,  '1m',  10.8456, 76.1755, 'വിളയൂർ (DEMO)',          true,  'in_use',    true, true),
    (v_admin, 'manual',       'usable',   'donate',    null, 'any', 10.8188, 76.2234, 'കുലുക്കല്ലൂർ (DEMO)',     false, 'available', true, true),
    (v_admin, 'foldable',     'good',     'free_lend', null, '1w',  10.7781, 76.2156, 'പരുതൂർ (DEMO)',          false, 'available', true, true),
    (v_admin, 'manual',       'good',     'rent',      40,   '1w',  10.8290, 76.1590, 'തിരുവേഗപ്പുറ (DEMO)',   true,  'available', false, true);
end $$;

-- Done. ✔️
