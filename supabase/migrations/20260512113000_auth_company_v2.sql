create extension if not exists moddatetime;

create or replace function public.generate_invite_code()
returns text
language plpgsql
as $$
declare
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text;
  attempts int := 0;
begin
  loop
    result := '';
    for i in 1..8 loop
      result := result || substr(
        chars,
        1 + floor(random() * length(chars))::int,
        1
      );
    end loop;

    exit when not exists (
      select 1 from public.companies where invite_code = result
    );

    attempts := attempts + 1;
    if attempts > 10 then
      raise exception 'Could not generate unique invite code';
    end if;
  end loop;

  return result;
end;
$$;

alter table public.profiles
  add column if not exists updated_at timestamptz not null default now();

update public.profiles
set email = coalesce(nullif(btrim(email), ''), id::text || '@missing.local');

alter table public.profiles
  alter column email set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_email_key'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles add constraint profiles_email_key unique (email);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_username_key'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles add constraint profiles_username_key unique (username);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_username_length'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_username_length check (length(username) between 2 and 20);
  end if;
end;
$$;

drop trigger if exists set_updated_at_profiles on public.profiles;
create trigger set_updated_at_profiles
  before update on public.profiles
  for each row
  execute function moddatetime(updated_at);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, username)
  values (
    new.id,
    coalesce(new.email, new.id::text || '@missing.local'),
    'user_' || substr(new.id::text, 1, 8)
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "profiles readable by authenticated" on public.profiles;
drop policy if exists "users create their own profile" on public.profiles;
drop policy if exists "users update their own profile" on public.profiles;
drop policy if exists "users delete their own profile" on public.profiles;

grant select, insert, update, delete on public.profiles to authenticated;

create policy "profiles readable by authenticated"
  on public.profiles for select to authenticated using (true);

create policy "users create their own profile"
  on public.profiles for insert to authenticated
  with check (id = auth.uid());

create policy "users update their own profile"
  on public.profiles for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "users delete their own profile"
  on public.profiles for delete to authenticated
  using (id = auth.uid());

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  invite_code text not null unique default public.generate_invite_code(),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.company_members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  joined_at timestamptz not null default now(),
  unique (user_id, company_id)
);

alter table public.companies enable row level security;
alter table public.company_members enable row level security;

grant select, insert, update on public.companies to authenticated;
grant select, insert, delete on public.company_members to authenticated;

drop policy if exists "companies readable by all" on public.companies;
drop policy if exists "any user can create a company" on public.companies;
drop policy if exists "creator can update their company" on public.companies;
drop policy if exists "memberships readable by all" on public.company_members;
drop policy if exists "users join companies themselves" on public.company_members;
drop policy if exists "users leave a company" on public.company_members;

create policy "companies readable by all"
  on public.companies for select to authenticated using (true);

create policy "any user can create a company"
  on public.companies for insert to authenticated
  with check (created_by = auth.uid());

create policy "creator can update their company"
  on public.companies for update to authenticated
  using (created_by = auth.uid())
  with check (
    exists (
      select 1
      from public.company_members
      where user_id = created_by
        and company_id = companies.id
    )
  );

create policy "memberships readable by all"
  on public.company_members for select to authenticated using (true);

create policy "users join companies themselves"
  on public.company_members for insert to authenticated
  with check (user_id = auth.uid());

create policy "users leave a company"
  on public.company_members for delete to authenticated
  using (user_id = auth.uid());

create index if not exists idx_company_members_user_id
  on public.company_members (user_id);

create index if not exists idx_company_members_company_id
  on public.company_members (company_id);

create or replace function public.create_or_update_profile(p_username text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_username text;
  v_profile public.profiles%rowtype;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    return jsonb_build_object('success', false, 'error_code', 'NOT_AUTHENTICATED', 'message', 'Utilisateur non connecté.');
  end if;

  v_username := nullif(btrim(p_username), '');

  if v_username is null then
    return jsonb_build_object('success', false, 'error_code', 'USERNAME_REQUIRED', 'message', 'Le pseudo est obligatoire.');
  end if;

  if char_length(v_username) < 2 or char_length(v_username) > 20 then
    return jsonb_build_object('success', false, 'error_code', 'USERNAME_INVALID', 'message', 'Le pseudo doit contenir entre 2 et 20 caractères.');
  end if;

  update public.profiles
  set username = v_username
  where id = v_user_id
  returning *
  into v_profile;

  return jsonb_build_object(
    'success', true,
    'data', jsonb_build_object(
      'id', v_profile.id,
      'email', v_profile.email,
      'username', v_profile.username,
      'avatar_url', v_profile.avatar_url,
      'created_at', v_profile.created_at,
      'updated_at', v_profile.updated_at
    )
  );
exception
  when unique_violation then
    return jsonb_build_object('success', false, 'error_code', 'USERNAME_TAKEN', 'message', 'Ce pseudo est déjà utilisé.');
end;
$$;

create or replace function public.create_company(p_name text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_name text;
  v_company public.companies%rowtype;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    return jsonb_build_object('success', false, 'error_code', 'NOT_AUTHENTICATED', 'message', 'Utilisateur non connecté.');
  end if;

  v_name := nullif(btrim(p_name), '');

  if v_name is null then
    return jsonb_build_object('success', false, 'error_code', 'COMPANY_NAME_REQUIRED', 'message', 'Le nom de l’entreprise est obligatoire.');
  end if;

  insert into public.companies (name, created_by)
  values (v_name, v_user_id)
  returning *
  into v_company;

  insert into public.company_members (user_id, company_id)
  values (v_user_id, v_company.id)
  on conflict (user_id, company_id) do nothing;

  return jsonb_build_object(
    'success', true,
    'data', jsonb_build_object(
      'company_id', v_company.id,
      'name', v_company.name,
      'invite_code', v_company.invite_code,
      'invite_url_path', '/join/' || v_company.invite_code
    )
  );
exception
  when unique_violation then
    return jsonb_build_object('success', false, 'error_code', 'COMPANY_NAME_TAKEN', 'message', 'Cette entreprise existe déjà.');
end;
$$;

create or replace function public.join_company_by_invite_code(p_invite_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_company public.companies%rowtype;
  v_membership_id uuid;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    return jsonb_build_object('success', false, 'error_code', 'NOT_AUTHENTICATED', 'message', 'Utilisateur non connecté.');
  end if;

  select *
  into v_company
  from public.companies
  where invite_code = upper(nullif(btrim(p_invite_code), ''));

  if v_company.id is null then
    return jsonb_build_object('success', false, 'error_code', 'INVALID_INVITE_CODE', 'message', 'Ce lien d’invitation est invalide.');
  end if;

  insert into public.company_members (user_id, company_id)
  values (v_user_id, v_company.id)
  on conflict (user_id, company_id) do nothing
  returning id into v_membership_id;

  return jsonb_build_object(
    'success', true,
    'data', jsonb_build_object(
      'company_id', v_company.id,
      'company_name', v_company.name,
      'membership_status', case when v_membership_id is null then 'already_member' else 'joined' end
    )
  );
end;
$$;

grant execute on function public.create_or_update_profile(text) to authenticated;
grant execute on function public.create_company(text) to authenticated;
grant execute on function public.join_company_by_invite_code(text) to authenticated;

create or replace view public.current_user_profile as
select
  p.id,
  p.email,
  p.username,
  p.avatar_url,
  company_data.company_id,
  company_data.company_name
from public.profiles p
left join lateral (
  select
    cm.company_id,
    c.name as company_name
  from public.company_members cm
  join public.companies c on c.id = cm.company_id
  where cm.user_id = p.id
  order by cm.joined_at
  limit 1
) company_data on true
where p.id = auth.uid();

create or replace view public.company_invite_info as
select
  c.id as company_id,
  c.name as company_name,
  c.invite_code,
  count(cm.id)::integer as member_count
from public.companies c
left join public.company_members cm on cm.company_id = c.id
group by c.id, c.name, c.invite_code;
