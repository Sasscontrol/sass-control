-- Corrige recursão infinita: a policy de "profiles" consultava a própria "profiles".
create or replace function is_admin() returns boolean language sql security definer stable set search_path=public as $$
  select exists(select 1 from profiles where id=auth.uid() and role in ('owner','admin')) $$;
revoke all on function is_admin() from public, anon;
grant execute on function is_admin() to authenticated;
do $$ declare t text; begin foreach t in array array['profiles','products','plans','subscribers','subscriptions','payments','uptime_checks','incidents','product_integrations','integration_events'] loop
  execute format('drop policy if exists admin_all on %I',t);
  execute format('create policy admin_all on %I for all to authenticated using (is_admin()) with check (is_admin())',t);
end loop; end $$;
create policy own_profile on profiles for select to authenticated using (id=auth.uid());
