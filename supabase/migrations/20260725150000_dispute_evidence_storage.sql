-- Bucket-ul "dispute-evidence" era referențiat din cod
-- (src/services/orderService.ts: uploadDisputeImage) dar nu exista deloc în
-- storage — orice upload de dovadă ar fi eșuat cu "Bucket not found".
-- Privat: pozele de dispută sunt vizibile doar celor doi participanți la
-- comanda respectivă, nu public ca imaginile de anunț.

insert into storage.buckets (id, name, public)
values ('dispute-evidence', 'dispute-evidence', false)
on conflict (id) do nothing;

-- Path-ul folosit de client e `${disputeId}/${userId}_${timestamp}.${ext}`,
-- deci primul segment al numelui obiectului e disputeId.
create policy dispute_evidence_storage_select_participant
  on storage.objects for select
  using (
    bucket_id = 'dispute-evidence'
    and exists (
      select 1 from disputes d
      join orders o on o.id = d.order_id
      where d.id::text = (storage.foldername(name))[1]
        and (o.buyer_id = auth.uid() or o.seller_id = auth.uid())
    )
  );

create policy dispute_evidence_storage_insert_participant
  on storage.objects for insert
  with check (
    bucket_id = 'dispute-evidence'
    and exists (
      select 1 from disputes d
      join orders o on o.id = d.order_id
      where d.id::text = (storage.foldername(name))[1]
        and (o.buyer_id = auth.uid() or o.seller_id = auth.uid())
        and d.status in ('open', 'under_review')
    )
  );
