-- Fix: public.users și public.admin_orders_with_disputes erau accesibile
-- prin API-ul REST oricui (anon) sau oricărui utilizator logat, expunând
-- email-uri (users) și toate comenzile/disputele (admin_orders_with_disputes)
-- fără nicio restricție de proprietar. Nu sunt folosite de aplicație —
-- blocăm accesul public complet.
revoke all on public.users from anon, authenticated;
revoke all on public.admin_orders_with_disputes from anon, authenticated;

-- Fix perf: politicile RLS de pe items apelau auth.uid() direct, reevaluat
-- pe fiecare rând. Îl încapsulăm în (select ...) ca Postgres să-l evalueze
-- o singură dată per interogare (InitPlan).
alter policy "Authenticated users can insert own items" on public.items
  with check (((select auth.uid()) is not null) and (user_id = (select auth.uid())));

alter policy "Users can delete own items" on public.items
  using ((select auth.uid()) = user_id);

alter policy "Users can update own items" on public.items
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
