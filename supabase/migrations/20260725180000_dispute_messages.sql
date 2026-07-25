-- Chat pe disputa: permite adminului sa ceara detalii suplimentare
-- direct cumparatorului/vanzatorului, in acelasi thread, vizibil ambilor.
create table if not exists public.dispute_messages (
  id uuid primary key default gen_random_uuid(),
  dispute_id uuid not null references public.disputes(id) on delete cascade,
  sender_id uuid not null references public.profiles(id),
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);

alter table public.dispute_messages enable row level security;

create policy dispute_messages_select_participant
  on public.dispute_messages for select
  using (
    exists (
      select 1 from public.disputes d
      join public.orders o on o.id = d.order_id
      where d.id = dispute_messages.dispute_id
        and (o.buyer_id = auth.uid() or o.seller_id = auth.uid())
    )
  );

create policy dispute_messages_select_admin
  on public.dispute_messages for select
  using (
    exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.is_admin)
  );

create policy dispute_messages_insert_participant
  on public.dispute_messages for insert
  with check (
    auth.uid() = sender_id
    and exists (
      select 1 from public.disputes d
      join public.orders o on o.id = d.order_id
      where d.id = dispute_messages.dispute_id
        and (o.buyer_id = auth.uid() or o.seller_id = auth.uid())
        and d.status in ('open', 'under_review')
    )
  );

create policy dispute_messages_insert_admin
  on public.dispute_messages for insert
  with check (
    auth.uid() = sender_id
    and exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.is_admin)
  );
