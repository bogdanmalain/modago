-- Panou de admin pentru rezolvarea disputelor din aplicație (nu doar SQL
-- manual). Necesită un flag de admin pe profiles + acces RLS extins pe
-- disputes/dispute_evidence/orders pentru contul (conturile) marcate admin.

alter table profiles add column if not exists is_admin boolean not null default false;

update profiles set is_admin = true
where id = 'd66c6ba2-bbac-474d-bf99-953325163e72'; -- bogdan.malain@gmail.com

create policy disputes_select_admin
  on disputes for select
  using (
    exists (select 1 from profiles where id = auth.uid() and is_admin)
  );

create policy dispute_evidence_select_admin
  on dispute_evidence for select
  using (
    exists (select 1 from profiles where id = auth.uid() and is_admin)
  );

create policy orders_select_admin
  on orders for select
  using (
    exists (select 1 from profiles where id = auth.uid() and is_admin)
  );

create policy dispute_evidence_storage_select_admin
  on storage.objects for select
  using (
    bucket_id = 'dispute-evidence'
    and exists (select 1 from profiles where id = auth.uid() and is_admin)
  );
