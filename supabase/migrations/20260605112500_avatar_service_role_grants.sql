grant usage on schema public to service_role;

grant select, update on public.profiles to service_role;
grant select, update on public.companies to service_role;
grant select on public.company_members to service_role;
