-- Performanță RLS: mai multe politici permisive pentru aceeași
-- combinație tabel+acțiune sunt oricum evaluate de Postgres ca
-- (qual1) OR (qual2) OR ... — deci le consolidăm explicit într-o
-- singură politică per acțiune. Zero schimbare de comportament:
-- fiecare condiție e păstrată identic, doar unite cu OR în loc să
-- fie politici separate (ceea ce Postgres ar face oricum implicit).

-- ── dispute_evidence: SELECT ──────────────────────────────────────
drop policy if exists "dispute_evidence_select_admin" on public.dispute_evidence;
drop policy if exists "evidence_select_participant" on public.dispute_evidence;
create policy "dispute_evidence_select_combined"
  on public.dispute_evidence for select
  using (
    (exists (select 1 from profiles where profiles.id = (select auth.uid()) and profiles.is_admin))
    or
    (exists (
      select 1 from disputes d join orders o on (o.id = d.order_id)
      where d.id = dispute_evidence.dispute_id
        and (o.buyer_id = (select auth.uid()) or o.seller_id = (select auth.uid()))
    ))
  );

-- ── dispute_messages: INSERT ──────────────────────────────────────
drop policy if exists "dispute_messages_insert_admin" on public.dispute_messages;
drop policy if exists "dispute_messages_insert_participant" on public.dispute_messages;
create policy "dispute_messages_insert_combined"
  on public.dispute_messages for insert
  with check (
    (
      (select auth.uid()) = sender_id
      and exists (select 1 from profiles where profiles.id = (select auth.uid()) and profiles.is_admin)
      and exists (select 1 from disputes d where d.id = dispute_messages.dispute_id and d.status = any (array['open'::dispute_status, 'under_review'::dispute_status]))
    )
    or
    (
      (select auth.uid()) = sender_id
      and exists (
        select 1 from disputes d join orders o on (o.id = d.order_id)
        where d.id = dispute_messages.dispute_id
          and (o.buyer_id = (select auth.uid()) or o.seller_id = (select auth.uid()))
          and d.status = any (array['open'::dispute_status, 'under_review'::dispute_status])
      )
    )
  );

-- ── dispute_messages: SELECT ──────────────────────────────────────
drop policy if exists "dispute_messages_select_admin" on public.dispute_messages;
drop policy if exists "dispute_messages_select_participant" on public.dispute_messages;
create policy "dispute_messages_select_combined"
  on public.dispute_messages for select
  using (
    (exists (select 1 from profiles where profiles.id = (select auth.uid()) and profiles.is_admin))
    or
    (exists (
      select 1 from disputes d join orders o on (o.id = d.order_id)
      where d.id = dispute_messages.dispute_id
        and (o.buyer_id = (select auth.uid()) or o.seller_id = (select auth.uid()))
    ))
  );

-- ── disputes: SELECT ──────────────────────────────────────────────
drop policy if exists "disputes_select_admin" on public.disputes;
drop policy if exists "disputes_select_participant" on public.disputes;
create policy "disputes_select_combined"
  on public.disputes for select
  using (
    (exists (select 1 from profiles where profiles.id = (select auth.uid()) and profiles.is_admin))
    or
    (exists (
      select 1 from orders o
      where o.id = disputes.order_id
        and (o.buyer_id = (select auth.uid()) or o.seller_id = (select auth.uid()))
    ))
  );

-- ── disputes: UPDATE ──────────────────────────────────────────────
drop policy if exists "disputes_update_buyer_offer" on public.disputes;
drop policy if exists "disputes_update_buyer_return" on public.disputes;
drop policy if exists "disputes_update_seller_reject" on public.disputes;
create policy "disputes_update_combined"
  on public.disputes for update
  using (
    ((select auth.uid()) = opened_by and status = 'open'::dispute_status)
    or
    ((select auth.uid()) = opened_by and return_stage = 'awaiting_return'::text)
    or
    (exists (select 1 from orders o where o.id = disputes.order_id and o.seller_id = (select auth.uid())) and offer_status = 'pending'::text)
  )
  with check (
    ((select auth.uid()) = opened_by and status = 'open'::dispute_status and offer_status = 'pending'::text)
    or
    ((select auth.uid()) = opened_by and return_stage = 'shipped'::text and return_tracking_number is not null and return_shipping_cost_mdl is not null)
    or
    (offer_status = 'rejected'::text and status = 'under_review'::dispute_status)
  );

-- ── messages: UPDATE ──────────────────────────────────────────────
drop policy if exists "Recipient can mark as read" on public.messages;
drop policy if exists "Users can soft delete own messages" on public.messages;
create policy "messages_update_combined"
  on public.messages for update
  using (
    (exists (
      select 1 from conversations c
      where c.id = messages.conversation_id
        and (c.buyer_id = (select auth.uid()) or c.seller_id = (select auth.uid()))
    ))
    or
    ((select auth.uid()) = sender_id)
  )
  with check (
    ((select auth.uid()) <> sender_id)
    or
    ((select auth.uid()) = sender_id)
  );

-- ── orders: SELECT ────────────────────────────────────────────────
drop policy if exists "orders_select_admin" on public.orders;
drop policy if exists "orders_select_participant" on public.orders;
create policy "orders_select_combined"
  on public.orders for select
  using (
    (exists (select 1 from profiles where profiles.id = (select auth.uid()) and profiles.is_admin))
    or
    ((select auth.uid()) = buyer_id or (select auth.uid()) = seller_id)
  );

-- ── orders: UPDATE ────────────────────────────────────────────────
drop policy if exists "orders_update_buyer" on public.orders;
drop policy if exists "orders_update_seller_tracking" on public.orders;
create policy "orders_update_combined"
  on public.orders for update
  using (
    ((select auth.uid()) = buyer_id and status = 'shipped'::order_status)
    or
    ((select auth.uid()) = seller_id and status = 'paid'::order_status)
  )
  with check (
    (status = any (array['delivered'::order_status, 'disputed'::order_status]))
    or
    (status = 'shipped'::order_status and tracking_number is not null and courier_name is not null)
  );
