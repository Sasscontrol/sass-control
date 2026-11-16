create table product_integrations(id uuid primary key default gen_random_uuid(), product_id uuid not null references products on delete cascade, key_prefix text not null unique, key_hash text not null, created_at timestamptz default now(), revoked_at timestamptz, last_event_at timestamptz);
create unique index one_active_key on product_integrations(product_id) where revoked_at is null;
create table integration_events(id bigint generated always as identity primary key, product_id uuid not null references products on delete cascade, integration_id uuid references product_integrations on delete set null, event_id text, type text, status text not null check (status in ('processed','failed')), error text, payload jsonb, received_at timestamptz default now());
create unique index uq_event_processed on integration_events(product_id,event_id) where status='processed';
create index on integration_events(product_id,received_at desc);
alter table plans add constraint plans_product_name_key unique(product_id,name);
alter table subscriptions add column external_id text;
create unique index uq_sub_external on subscriptions(subscriber_id,external_id);
do $$ declare t text; begin foreach t in array array['product_integrations','integration_events'] loop
 execute format('alter table %I enable row level security',t);
 execute format($f$create policy admin_all on %I for all to authenticated using (exists(select 1 from profiles p where p.id=auth.uid() and p.role in ('owner','admin'))) with check (exists(select 1 from profiles p where p.id=auth.uid() and p.role in ('owner','admin')))$f$,t); end loop; end $$;
-- key_hash nunca é exposto ao navegador: o painel só lê via rotas de servidor
revoke select on product_integrations from authenticated;
create function process_integration_event(p_integration uuid,p_product uuid,p_event jsonb) returns text language plpgsql security definer set search_path=public as $$
declare d jsonb:=coalesce(p_event->'data','{}'); v_sub uuid; v_plan uuid; v_ss uuid; n int;
begin
 insert into integration_events(product_id,integration_id,event_id,type,status,payload) values(p_product,p_integration,p_event->>'id',p_event->>'type','processed',p_event) on conflict (product_id,event_id) where status='processed' do nothing;
 get diagnostics n=row_count; if n=0 then return 'duplicate'; end if;
 if p_event->>'type'='subscriber.upserted' then
  insert into subscribers(product_id,external_id,name,email) values(p_product,d->>'external_id',d->>'name',d->>'email') on conflict(product_id,external_id) do update set name=excluded.name,email=excluded.email;
 elsif p_event->>'type'='subscription.upserted' then
  select id into v_sub from subscribers where product_id=p_product and external_id=d->>'subscriber_external_id';
  if v_sub is null then raise exception 'assinante % não encontrado: envie subscriber.upserted antes', d->>'subscriber_external_id'; end if;
  insert into plans(product_id,name,price_cents) values(p_product,d#>>'{plan,name}',(d#>>'{plan,price_cents}')::int) on conflict(product_id,name) do update set price_cents=excluded.price_cents returning id into v_plan;
  insert into subscriptions(subscriber_id,plan_id,status,external_id,trial_ends_at,current_period_end,canceled_at) values(v_sub,v_plan,d->>'status',d->>'external_id',(d->>'trial_ends_at')::timestamptz,(d->>'current_period_end')::timestamptz,(d->>'canceled_at')::timestamptz)
   on conflict(subscriber_id,external_id) do update set plan_id=excluded.plan_id,status=excluded.status,trial_ends_at=excluded.trial_ends_at,current_period_end=excluded.current_period_end,canceled_at=excluded.canceled_at;
 elsif p_event->>'type'='payment.recorded' then
  select s.id into v_ss from subscriptions s join subscribers b on b.id=s.subscriber_id where b.product_id=p_product and s.external_id=d->>'subscription_external_id';
  if v_ss is null then raise exception 'assinatura % não encontrada', d->>'subscription_external_id'; end if;
  insert into payments(subscription_id,amount_cents,status,paid_at) values(v_ss,(d->>'amount_cents')::int,d->>'status',(d->>'paid_at')::timestamptz);
 end if;
 update product_integrations set last_event_at=now() where id=p_integration;
 return 'processed';
end $$;
revoke all on function process_integration_event from public,anon,authenticated;
grant execute on function process_integration_event to service_role;
