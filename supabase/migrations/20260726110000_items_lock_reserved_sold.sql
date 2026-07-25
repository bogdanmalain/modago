-- Vânzătorul nu mai poate edita/șterge un articol cât timp e 'reserved'
-- (comandă în curs de plată) sau 'sold' — până acum nu exista nicio
-- restricție, deci un articol putea fi modificat/șters în mijlocul unei
-- tranzacții active.
drop policy if exists "Users can update own items" on items;
create policy "Users can update own items"
  on items for update
  using ((select auth.uid()) = user_id and status = 'active')
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete own items" on items;
create policy "Users can delete own items"
  on items for delete
  using ((select auth.uid()) = user_id and status = 'active');
