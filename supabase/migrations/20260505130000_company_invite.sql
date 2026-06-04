create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text unique not null,
  created_by uuid references public.profiles(id),
  created_at timestamp with time zone default now()
);

create table if not exists public.company_members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  company_id uuid references public.companies(id) on delete cascade,
  role text default 'member',
  created_at timestamp with time zone default now(),
  unique (user_id, company_id)
);

alter table public.companies enable row level security;

alter table public.company_members enable row level security;

revoke all on public.companies from public;

revoke all on public.company_members from public;

grant select on public.companies to anon, authenticated;

grant select on public.company_members to authenticated;

drop policy if exists "companies_select_public" on public.companies;

create policy "companies_select_public"
  on public.companies
  for select
  to anon, authenticated
  using (true);

create or replace function public.is_company_member(target_company_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.company_members
    where company_members.company_id = target_company_id
      and company_members.user_id = auth.uid()
  );
$$;

revoke all on function public.is_company_member(uuid) from public;

grant execute on function public.is_company_member(uuid) to authenticated;

drop policy if exists "company_members_select_company" on public.company_members;

create policy "company_members_select_company"
  on public.company_members
  for select
  to authenticated
  using (
    user_id = auth.uid()
    or public.is_company_member(company_id)
  );

create or replace function public.create_company(name text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_name text;
  v_prefix text;
  v_invite_code text;
  v_company public.companies%rowtype;
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

  v_prefix := upper(regexp_replace(v_name, '[^a-zA-Z0-9]+', '', 'g'));
  v_prefix := left(coalesce(nullif(v_prefix, ''), 'COMP') || 'COMP', 4);

  loop
    v_invite_code := v_prefix || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 5));

    exit when not exists (
      select 1
      from public.companies
      where companies.invite_code = v_invite_code
    );
  end loop;

  insert into public.companies (name, invite_code, created_by)
  values (v_name, v_invite_code, v_user_id)
  returning *
  into v_company;

  insert into public.company_members (user_id, company_id, role)
  values (v_user_id, v_company.id, 'member')
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

  insert into public.company_members (user_id, company_id, role)
  values (v_user_id, v_company.id, 'member')
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
  order by company_members.created_at asc
  limit 1
) current_company on true
where profiles.id = auth.uid();

revoke all on public.current_user_profile from public;

grant select on public.current_user_profile to authenticated;

create or replace view public.company_members_with_scores
as
select
  company_members.company_id,
  company_members.user_id,
  profiles.username,
  profiles.avatar_url,
  0::integer as total_points,
  0::integer as exact_scores_count,
  company_members.created_at as joined_at
from public.company_members
join public.profiles on profiles.id = company_members.user_id
where auth.uid() is not null
  and public.is_company_member(company_members.company_id);

revoke all on public.company_members_with_scores from public;

grant select on public.company_members_with_scores to authenticated;

create or replace view public.company_invite_info
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

grant select on public.company_invite_info to anon, authenticated;
