-- Full data export of every public table as JSON, in one shot.
-- Run with:
--   npx supabase db query --file scripts/export-data.sql --linked --output json > /tmp/out.json
-- then extract rows[0] as an object of { table_name: [...rows] } (see scripts/export-data.js).
-- Keep the output OUT of git — it's real user/order/payment data.

select jsonb_build_object(
  'balance_adjustments', (select coalesce(jsonb_agg(t), '[]'::jsonb) from public.balance_adjustments t),
  'conversations', (select coalesce(jsonb_agg(t), '[]'::jsonb) from public.conversations t),
  'dispute_evidence', (select coalesce(jsonb_agg(t), '[]'::jsonb) from public.dispute_evidence t),
  'dispute_messages', (select coalesce(jsonb_agg(t), '[]'::jsonb) from public.dispute_messages t),
  'disputes', (select coalesce(jsonb_agg(t), '[]'::jsonb) from public.disputes t),
  'escrow_transactions', (select coalesce(jsonb_agg(t), '[]'::jsonb) from public.escrow_transactions t),
  'favorites', (select coalesce(jsonb_agg(t), '[]'::jsonb) from public.favorites t),
  'items', (select coalesce(jsonb_agg(t), '[]'::jsonb) from public.items t),
  'messages', (select coalesce(jsonb_agg(t), '[]'::jsonb) from public.messages t),
  'notifications', (select coalesce(jsonb_agg(t), '[]'::jsonb) from public.notifications t),
  'orders', (select coalesce(jsonb_agg(t), '[]'::jsonb) from public.orders t),
  'profiles', (select coalesce(jsonb_agg(t), '[]'::jsonb) from public.profiles t),
  'seller_reviews', (select coalesce(jsonb_agg(t), '[]'::jsonb) from public.seller_reviews t),
  'shipping_addresses', (select coalesce(jsonb_agg(t), '[]'::jsonb) from public.shipping_addresses t),
  'withdrawal_requests', (select coalesce(jsonb_agg(t), '[]'::jsonb) from public.withdrawal_requests t)
) as full_data;
