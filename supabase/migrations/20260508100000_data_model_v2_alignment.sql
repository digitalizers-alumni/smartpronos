create schema if not exists extensions;

create extension if not exists moddatetime with schema extensions;

drop view if exists public.company_invite_info;

drop view if exists public.company_members_with_scores;

drop view if exists public.current_user_profile;

create or replace function public.generate_invite_code()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text;
  attempts integer := 0;
begin
  loop
    result := '';

    for i in 1..8 loop
      result := result || substr(chars, 1 + floor(random() * length(chars))::integer, 1);
    end loop;

    exit when not exists (
      select 1
      from public.companies
      where companies.invite_code = result
    );

    attempts := attempts + 1;

    if attempts > 10 then
      raise exception 'Could not generate unique invite code';
    end if;
  end loop;

  return result;
end;
$$;

revoke all on function public.generate_invite_code() from public;

grant execute on function public.generate_invite_code() to authenticated;

alter table public.profiles
  add column if not exists updated_at timestamp with time zone not null default now();

update public.profiles
set
  email = coalesce(nullif(btrim(email), ''), id::text || '@missing.local'),
  created_at = coalesce(created_at, now()),
  updated_at = coalesce(updated_at, now());

with normalized as (
  select
    id,
    case
      when char_length(coalesce(nullif(btrim(username), ''), '')) < 2
        then 'user_' || substr(id::text, 1, 8)
      when char_length(btrim(username)) > 20
        then left(btrim(username), 20)
      else btrim(username)
    end as base_username
  from public.profiles
),
ranked as (
  select
    id,
    base_username,
    row_number() over (partition by lower(base_username) order by id) as duplicate_rank
  from normalized
)
update public.profiles
set username = case
  when ranked.duplicate_rank = 1
    then ranked.base_username
  else left(ranked.base_username, 12) || '_' || substr(ranked.id::text, 1, 7)
end
from ranked
where profiles.id = ranked.id;

with ranked as (
  select
    id,
    email,
    row_number() over (partition by lower(email) order by id) as duplicate_rank
  from public.profiles
)
update public.profiles
set email = case
  when position('@' in ranked.email) > 1 then
    split_part(ranked.email, '@', 1)
      || '+'
      || substr(ranked.id::text, 1, 8)
      || '@'
      || split_part(ranked.email, '@', 2)
  else
    ranked.email || '+' || substr(ranked.id::text, 1, 8) || '@missing.local'
end
from ranked
where profiles.id = ranked.id
  and ranked.duplicate_rank > 1;

alter table public.profiles
  alter column email set not null,
  alter column username set not null,
  alter column created_at set default now(),
  alter column created_at set not null,
  alter column updated_at set default now(),
  alter column updated_at set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_email_key'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_email_key unique (email);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_username_key'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_username_key unique (username);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_username_length'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_username_length check (char_length(username) between 2 and 20);
  end if;
end;
$$;

drop trigger if exists set_updated_at on public.profiles;

create trigger set_updated_at
  before update on public.profiles
  for each row
  execute function extensions.moddatetime(updated_at);

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

revoke all on function public.handle_new_user() from public;

alter table public.companies
  alter column invite_code set default public.generate_invite_code(),
  alter column created_at set default now(),
  alter column created_at set not null;

update public.companies
set name = coalesce(nullif(btrim(name), ''), 'Company ' || substr(id::text, 1, 8));

with ranked as (
  select
    id,
    name,
    row_number() over (partition by lower(name) order by created_at, id) as duplicate_rank
  from public.companies
)
update public.companies
set name = ranked.name || ' ' || ranked.duplicate_rank
from ranked
where companies.id = ranked.id
  and ranked.duplicate_rank > 1;

do $$
declare
  company_record record;
begin
  for company_record in
    select id
    from public.companies
    where invite_code is null
      or invite_code !~ '^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$'
  loop
    update public.companies
    set invite_code = public.generate_invite_code()
    where id = company_record.id;
  end loop;
end;
$$;

alter table public.companies
  alter column name set not null,
  alter column invite_code set not null;

alter table public.companies
  drop constraint if exists companies_created_by_fkey;

alter table public.companies
  add constraint companies_created_by_fkey
  foreign key (created_by)
  references public.profiles(id)
  on delete set null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'companies_name_key'
      and conrelid = 'public.companies'::regclass
  ) then
    alter table public.companies
      add constraint companies_name_key unique (name);
  end if;
end;
$$;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'company_members'
      and column_name = 'created_at'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'company_members'
      and column_name = 'joined_at'
  ) then
    alter table public.company_members rename column created_at to joined_at;
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'company_members'
      and column_name = 'joined_at'
  ) then
    alter table public.company_members
      add column joined_at timestamp with time zone not null default now();
  end if;
end;
$$;

delete from public.company_members
where user_id is null
  or company_id is null;

alter table public.company_members
  drop column if exists role,
  alter column user_id set not null,
  alter column company_id set not null,
  alter column joined_at set default now(),
  alter column joined_at set not null;

create index if not exists company_members_user_id_idx
  on public.company_members (user_id);

create index if not exists company_members_company_id_idx
  on public.company_members (company_id);

revoke all on public.profiles from public;

revoke all on public.companies from public;

revoke all on public.company_members from public;

grant select, insert, update, delete on public.profiles to authenticated;

grant select, insert, update on public.companies to authenticated;

grant select, insert, delete on public.company_members to authenticated;

drop policy if exists "profiles_select_own" on public.profiles;

drop policy if exists "profiles_insert_own" on public.profiles;

drop policy if exists "profiles_update_own" on public.profiles;

drop policy if exists "profiles readable by authenticated" on public.profiles;

drop policy if exists "users create their own profile" on public.profiles;

drop policy if exists "users update their own profile" on public.profiles;

drop policy if exists "users delete their own profile" on public.profiles;

create policy "profiles readable by authenticated"
  on public.profiles
  for select
  to authenticated
  using (true);

create policy "users create their own profile"
  on public.profiles
  for insert
  to authenticated
  with check (id = auth.uid());

create policy "users update their own profile"
  on public.profiles
  for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "users delete their own profile"
  on public.profiles
  for delete
  to authenticated
  using (id = auth.uid());

drop policy if exists "companies_select_public" on public.companies;

drop policy if exists "companies readable by all" on public.companies;

drop policy if exists "any user can create a company" on public.companies;

drop policy if exists "creator can update their company" on public.companies;

create policy "companies readable by all"
  on public.companies
  for select
  to authenticated
  using (true);

create policy "any user can create a company"
  on public.companies
  for insert
  to authenticated
  with check (created_by = auth.uid());

create policy "creator can update their company"
  on public.companies
  for update
  to authenticated
  using (created_by = auth.uid())
  with check (
    created_by = auth.uid()
    and exists (
      select 1
      from public.company_members
      where company_members.user_id = auth.uid()
        and company_members.company_id = companies.id
    )
  );

drop policy if exists "company_members_select_company" on public.company_members;

drop policy if exists "memberships readable by all" on public.company_members;

drop policy if exists "users join companies themselves" on public.company_members;

drop policy if exists "users leave a company" on public.company_members;

create policy "memberships readable by all"
  on public.company_members
  for select
  to authenticated
  using (true);

create policy "users join companies themselves"
  on public.company_members
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "users leave a company"
  on public.company_members
  for delete
  to authenticated
  using (user_id = auth.uid());

create or replace function public.create_or_update_profile(username text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_username text;
  v_email text;
  v_profile public.profiles%rowtype;
  v_constraint text;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    return jsonb_build_object(
      'success', false,
      'error_code', 'NOT_AUTHENTICATED',
      'message', 'Utilisateur non connecté.'
    );
  end if;

  v_username := nullif(btrim($1), '');

  if v_username is null then
    return jsonb_build_object(
      'success', false,
      'error_code', 'USERNAME_REQUIRED',
      'message', 'Le pseudo est obligatoire.'
    );
  end if;

  if char_length(v_username) < 2 or char_length(v_username) > 20 then
    return jsonb_build_object(
      'success', false,
      'error_code', 'USERNAME_INVALID',
      'message', 'Le pseudo doit contenir entre 2 et 20 caractères.'
    );
  end if;

  v_email := coalesce(auth.jwt() ->> 'email', v_user_id::text || '@missing.local');

  insert into public.profiles (id, email, username)
  values (v_user_id, v_email, v_username)
  on conflict (id) do update
    set email = coalesce(excluded.email, public.profiles.email),
        username = excluded.username
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
    get stacked diagnostics v_constraint = constraint_name;

    if v_constraint in ('profiles_username_key', 'profiles_username_unique') then
      return jsonb_build_object(
        'success', false,
        'error_code', 'USERNAME_TAKEN',
        'message', 'Ce pseudo est déjà utilisé.'
      );
    end if;

    raise;
end;
$$;

revoke all on function public.create_or_update_profile(text) from public;

grant execute on function public.create_or_update_profile(text) to authenticated;

create or replace function public.create_company(name text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_name text;
  v_company public.companies%rowtype;
  v_constraint text;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    return jsonb_build_object(
      'success', false,
      'error_code', 'NOT_AUTHENTICATED',
      'message', 'Utilisateur non connecté.'
    );
  end if;

  v_name := nullif(btrim($1), '');

  if v_name is null then
    return jsonb_build_object(
      'success', false,
      'error_code', 'COMPANY_NAME_REQUIRED',
      'message', 'Le nom de l’entreprise est obligatoire.'
    );
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
    get stacked diagnostics v_constraint = constraint_name;

    if v_constraint = 'companies_name_key' then
      return jsonb_build_object(
        'success', false,
        'error_code', 'COMPANY_NAME_TAKEN',
        'message', 'Cette entreprise existe déjà.'
      );
    end if;

    raise;
end;
$$;

revoke all on function public.create_company(text) from public;

grant execute on function public.create_company(text) to authenticated;

create or replace function public.join_company_by_invite_code(invite_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_invite_code text;
  v_company public.companies%rowtype;
  v_inserted_membership_id uuid;
  v_membership_status text;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    return jsonb_build_object(
      'success', false,
      'error_code', 'NOT_AUTHENTICATED',
      'message', 'Utilisateur non connecté.'
    );
  end if;

  v_invite_code := upper(nullif(btrim($1), ''));

  select *
  into v_company
  from public.companies
  where companies.invite_code = v_invite_code;

  if v_company.id is null then
    return jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_INVITE_CODE',
      'message', 'Ce lien d’invitation est invalide.'
    );
  end if;

  insert into public.company_members (user_id, company_id)
  values (v_user_id, v_company.id)
  on conflict (user_id, company_id) do nothing
  returning id
  into v_inserted_membership_id;

  if v_inserted_membership_id is null then
    v_membership_status := 'already_member';
  else
    v_membership_status := 'joined';
  end if;

  return jsonb_build_object(
    'success', true,
    'data', jsonb_build_object(
      'company_id', v_company.id,
      'company_name', v_company.name,
      'membership_status', v_membership_status
    )
  );
end;
$$;

revoke all on function public.join_company_by_invite_code(text) from public;

grant execute on function public.join_company_by_invite_code(text) to authenticated;

create or replace view public.current_user_profile
with (security_invoker = true)
as
select
  profiles.id,
  profiles.email,
  profiles.username,
  profiles.avatar_url,
  current_company.company_id,
  current_company.company_name
from public.profiles
left join lateral (
  select
    company_members.company_id,
    companies.name as company_name
  from public.company_members
  join public.companies on companies.id = company_members.company_id
  where company_members.user_id = profiles.id
  order by company_members.joined_at asc
  limit 1
) current_company on true
where profiles.id = auth.uid();

revoke all on public.current_user_profile from public;

grant select on public.current_user_profile to authenticated;

create or replace view public.company_members_with_scores
with (security_invoker = true)
as
select
  company_members.company_id,
  company_members.user_id,
  profiles.username,
  profiles.avatar_url,
  0::integer as total_points,
  0::integer as exact_count,
  company_members.joined_at
from public.company_members
join public.profiles on profiles.id = company_members.user_id;

revoke all on public.company_members_with_scores from public;

grant select on public.company_members_with_scores to authenticated;

create or replace view public.company_invite_info
with (security_invoker = true)
as
select
  companies.id as company_id,
  companies.name as company_name,
  companies.invite_code,
  count(company_members.id)::integer as member_count
from public.companies
left join public.company_members on company_members.company_id = companies.id
group by companies.id, companies.name, companies.invite_code;

revoke all on public.company_invite_info from public;

grant select on public.company_invite_info to authenticated;

drop function if exists public.is_company_member(uuid);
