-- Eliberează articolele blocate în 'reserved' când cumpărătorul abandonează
-- checkout-ul (nu confirmă plata în Stripe) — până acum nimic nu anula
-- comanda 'pending_payment' rămasă agățată, deci articolul rămânea
-- indisponibil pentru vânzare la nesfârșit.
select cron.schedule(
  'modago-release-abandoned-reservations',
  '*/15 * * * *',
  $$
  with abandoned as (
    update orders
    set status = 'cancelled'
    where status = 'pending_payment'
      and created_at < now() - interval '30 minutes'
    returning item_id
  )
  update items
  set status = 'active'
  where status = 'reserved'
    and id in (select item_id from abandoned);
  $$
);
