-- Performanță RLS: auth.uid() era reevaluat per rând în loc de o singură
-- dată per query. Înfășurarea în (select auth.uid()) lasă Postgres să-l
-- trateze ca un initplan stabil, evaluat o singură dată. Nicio schimbare
-- de logică — doar aceleași condiții, rescrise mecanic.
alter policy "balance_adjustments_select_own" on public.balance_adjustments
  using ((user_id = (select auth.uid())));

alter policy "Buyer can create conversation" on public.conversations
  with check (((select auth.uid()) = buyer_id));

alter policy "Users can hide their own conversations" on public.conversations
  using ((((select auth.uid()) = buyer_id) OR ((select auth.uid()) = seller_id)))
  with check ((((select auth.uid()) = buyer_id) OR ((select auth.uid()) = seller_id)));

alter policy "Users see own conversations" on public.conversations
  using ((((select auth.uid()) = buyer_id) OR ((select auth.uid()) = seller_id)));

alter policy "dispute_evidence_select_admin" on public.dispute_evidence
  using ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = (select auth.uid())) AND profiles.is_admin))));

alter policy "evidence_insert_participant" on public.dispute_evidence
  with check ((((select auth.uid()) = uploaded_by) AND (EXISTS ( SELECT 1
   FROM (disputes d
     JOIN orders o ON ((o.id = d.order_id)))
  WHERE ((d.id = dispute_evidence.dispute_id) AND ((o.buyer_id = (select auth.uid())) OR (o.seller_id = (select auth.uid()))) AND (d.status = ANY (ARRAY['open'::dispute_status, 'under_review'::dispute_status])))))));

alter policy "evidence_select_participant" on public.dispute_evidence
  using ((EXISTS ( SELECT 1
   FROM (disputes d
     JOIN orders o ON ((o.id = d.order_id)))
  WHERE ((d.id = dispute_evidence.dispute_id) AND ((o.buyer_id = (select auth.uid())) OR (o.seller_id = (select auth.uid())))))));

alter policy "dispute_messages_insert_admin" on public.dispute_messages
  with check ((((select auth.uid()) = sender_id) AND (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = (select auth.uid())) AND profiles.is_admin))) AND (EXISTS ( SELECT 1
   FROM disputes d
  WHERE ((d.id = dispute_messages.dispute_id) AND (d.status = ANY (ARRAY['open'::dispute_status, 'under_review'::dispute_status])))))));

alter policy "dispute_messages_insert_participant" on public.dispute_messages
  with check ((((select auth.uid()) = sender_id) AND (EXISTS ( SELECT 1
   FROM (disputes d
     JOIN orders o ON ((o.id = d.order_id)))
  WHERE ((d.id = dispute_messages.dispute_id) AND ((o.buyer_id = (select auth.uid())) OR (o.seller_id = (select auth.uid()))) AND (d.status = ANY (ARRAY['open'::dispute_status, 'under_review'::dispute_status])))))));

alter policy "dispute_messages_select_admin" on public.dispute_messages
  using ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = (select auth.uid())) AND profiles.is_admin))));

alter policy "dispute_messages_select_participant" on public.dispute_messages
  using ((EXISTS ( SELECT 1
   FROM (disputes d
     JOIN orders o ON ((o.id = d.order_id)))
  WHERE ((d.id = dispute_messages.dispute_id) AND ((o.buyer_id = (select auth.uid())) OR (o.seller_id = (select auth.uid())))))));

alter policy "disputes_insert_buyer" on public.disputes
  with check ((((select auth.uid()) = opened_by) AND (EXISTS ( SELECT 1
   FROM orders o
  WHERE ((o.id = disputes.order_id) AND (o.buyer_id = (select auth.uid())) AND (o.status = 'shipped'::order_status))))));

alter policy "disputes_select_admin" on public.disputes
  using ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = (select auth.uid())) AND profiles.is_admin))));

alter policy "disputes_select_participant" on public.disputes
  using ((EXISTS ( SELECT 1
   FROM orders o
  WHERE ((o.id = disputes.order_id) AND ((o.buyer_id = (select auth.uid())) OR (o.seller_id = (select auth.uid())))))));

alter policy "disputes_update_buyer_offer" on public.disputes
  using ((((select auth.uid()) = opened_by) AND (status = 'open'::dispute_status)))
  with check ((((select auth.uid()) = opened_by) AND (status = 'open'::dispute_status) AND (offer_status = 'pending'::text)));

alter policy "disputes_update_buyer_return" on public.disputes
  using ((((select auth.uid()) = opened_by) AND (return_stage = 'awaiting_return'::text)))
  with check ((((select auth.uid()) = opened_by) AND (return_stage = 'shipped'::text) AND (return_tracking_number IS NOT NULL) AND (return_shipping_cost_mdl IS NOT NULL)));

alter policy "disputes_update_seller_reject" on public.disputes
  using (((EXISTS ( SELECT 1
   FROM orders o
  WHERE ((o.id = disputes.order_id) AND (o.seller_id = (select auth.uid()))))) AND (offer_status = 'pending'::text)))
  with check (((offer_status = 'rejected'::text) AND (status = 'under_review'::dispute_status)));

alter policy "escrow_select_participant" on public.escrow_transactions
  using ((EXISTS ( SELECT 1
   FROM orders o
  WHERE ((o.id = escrow_transactions.order_id) AND ((o.buyer_id = (select auth.uid())) OR (o.seller_id = (select auth.uid())))))));

alter policy "favorites_delete_own" on public.favorites
  using (((select auth.uid()) = user_id));

alter policy "favorites_insert_own" on public.favorites
  with check (((select auth.uid()) = user_id));

alter policy "Participants see messages" on public.messages
  using ((EXISTS ( SELECT 1
   FROM conversations c
  WHERE ((c.id = messages.conversation_id) AND ((c.buyer_id = (select auth.uid())) OR (c.seller_id = (select auth.uid())))))));

alter policy "Participants send messages" on public.messages
  with check ((((select auth.uid()) = sender_id) AND (EXISTS ( SELECT 1
   FROM conversations c
  WHERE ((c.id = messages.conversation_id) AND ((c.buyer_id = (select auth.uid())) OR (c.seller_id = (select auth.uid()))))))));

alter policy "Recipient can mark as read" on public.messages
  using ((EXISTS ( SELECT 1
   FROM conversations c
  WHERE ((c.id = messages.conversation_id) AND ((c.buyer_id = (select auth.uid())) OR (c.seller_id = (select auth.uid())))))))
  with check (((select auth.uid()) <> sender_id));

alter policy "Users can soft delete own messages" on public.messages
  using (((select auth.uid()) = sender_id))
  with check (((select auth.uid()) = sender_id));

alter policy "notifications_select_owner" on public.notifications
  using (((select auth.uid()) = user_id));

alter policy "notifications_update_owner" on public.notifications
  using (((select auth.uid()) = user_id))
  with check (((select auth.uid()) = user_id));

alter policy "orders_insert_buyer" on public.orders
  with check (((select auth.uid()) = buyer_id));

alter policy "orders_select_admin" on public.orders
  using ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = (select auth.uid())) AND profiles.is_admin))));

alter policy "orders_select_participant" on public.orders
  using ((((select auth.uid()) = buyer_id) OR ((select auth.uid()) = seller_id)));

alter policy "orders_update_buyer" on public.orders
  using ((((select auth.uid()) = buyer_id) AND (status = 'shipped'::order_status)))
  with check ((status = ANY (ARRAY['delivered'::order_status, 'disputed'::order_status])));

alter policy "orders_update_seller_tracking" on public.orders
  using ((((select auth.uid()) = seller_id) AND (status = 'paid'::order_status)))
  with check (((status = 'shipped'::order_status) AND (tracking_number IS NOT NULL) AND (courier_name IS NOT NULL)));

alter policy "Own insert" on public.profiles
  with check (((select auth.uid()) = id));

alter policy "Own update" on public.profiles
  using (((select auth.uid()) = id));

alter policy "reviews_insert_buyer" on public.seller_reviews
  with check ((((select auth.uid()) = reviewer_id) AND (EXISTS ( SELECT 1
   FROM orders o
  WHERE ((o.id = seller_reviews.order_id) AND (o.buyer_id = (select auth.uid())) AND (o.status = 'completed'::order_status))))));

alter policy "addresses_owner_all" on public.shipping_addresses
  using (((select auth.uid()) = user_id))
  with check (((select auth.uid()) = user_id));

alter policy "withdrawal_requests_insert_owner" on public.withdrawal_requests
  with check (((select auth.uid()) = user_id));

alter policy "withdrawal_requests_select_owner" on public.withdrawal_requests
  using (((select auth.uid()) = user_id));
