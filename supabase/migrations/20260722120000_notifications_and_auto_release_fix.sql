-- Notificări in-app (banner la login / intrare în aplicație) ────────
create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  order_id uuid references orders(id) on delete cascade,
  title text not null,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_id_created_at_idx
  on notifications(user_id, created_at desc);

alter table notifications enable row level security;

create policy notifications_select_owner
  on notifications for select
  using (auth.uid() = user_id);

create policy notifications_update_owner
  on notifications for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Fix: auto-release-ul (cron orar) făcea UPDATE direct pe orders,
-- ocolind release-funds → nicio intrare în escrow_transactions și
-- nicio notificare către vânzător. Îl trecem să apeleze edge function-ul.
create extension if not exists pg_net;

select cron.unschedule('modago-escrow-auto-release');

select cron.schedule(
  'modago-escrow-auto-release',
  '0 * * * *',
  $$
  select net.http_post(
    url := 'https://hvtlibovcawhgiqwgdte.supabase.co/functions/v1/release-funds',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (
        select decrypted_secret from vault.decrypted_secrets
        where name = 'modago_service_role_key'
      )
    ),
    body := jsonb_build_object('order_id', o.id, 'trigger', 'auto_release')
  )
  from orders o
  where o.status = 'shipped'
    and o.auto_release_at is not null
    and o.auto_release_at <= now()
    and o.has_open_ticket = false;
  $$
);
