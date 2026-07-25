-- Blochează chatul de dispută (inclusiv pentru admin) odată ce disputa
-- s-a finalizat — discuția rămâne vizibilă, dar nimeni nu mai poate scrie.
drop policy if exists dispute_messages_insert_admin on public.dispute_messages;

create policy dispute_messages_insert_admin
  on public.dispute_messages for insert
  with check (
    auth.uid() = sender_id
    and exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.is_admin)
    and exists (
      select 1 from public.disputes d
      where d.id = dispute_messages.dispute_id
        and d.status in ('open', 'under_review')
    )
  );
