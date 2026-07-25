-- Negociere directă buyer/seller înainte de escaladare la admin:
-- cumpărătorul propune un procent de rambursare, vânzătorul acceptă
-- (rezolvare automată, fără admin) sau respinge (escaladează la admin).

alter table disputes add column if not exists buyer_offer_pct numeric
  check (buyer_offer_pct is null or (buyer_offer_pct >= 0 and buyer_offer_pct <= 100));

alter table disputes add column if not exists offer_status text
  not null default 'none'
  check (offer_status in ('none', 'pending', 'accepted', 'rejected'));

-- Buyer propune o ofertă cât timp disputa e 'open' (nu s-a escaladat deja).
create policy disputes_update_buyer_offer
  on disputes for update
  using (auth.uid() = opened_by and status = 'open')
  with check (auth.uid() = opened_by and status = 'open' and offer_status = 'pending');

-- Seller respinge oferta → escaladează la admin (status → under_review).
-- Acceptarea NU trece prin update direct — se face prin release-funds
-- (trigger seller_accept_offer), ca să miște și banii, nu doar statusul.
create policy disputes_update_seller_reject
  on disputes for update
  using (
    exists (select 1 from orders o where o.id = disputes.order_id and o.seller_id = auth.uid())
    and offer_status = 'pending'
  )
  with check (offer_status = 'rejected' and status = 'under_review');
