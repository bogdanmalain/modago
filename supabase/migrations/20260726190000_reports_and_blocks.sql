-- Raportare de conținut + blocare utilizatori — cerință a politicii Google
-- Play pentru aplicații cu conținut generat de utilizatori (marketplace +
-- chat), inexistente până acum în aplicație.

-- ============================================================
-- 1. Rapoarte (anunț / utilizator / conversație)
-- ============================================================
create table reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references profiles(id) on delete cascade,
  target_type text not null check (target_type in ('item', 'user', 'conversation')),
  item_id bigint references items(id) on delete set null,
  reported_user_id uuid references profiles(id) on delete set null,
  conversation_id uuid references conversations(id) on delete set null,
  reason text not null check (char_length(reason) between 1 and 100),
  details text check (details is null or char_length(details) <= 2000),
  status text not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
  admin_note text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index idx_reports_status on reports (status);
create index idx_reports_item on reports (item_id) where item_id is not null;

alter table reports enable row level security;

-- Oricine autentificat poate raporta (doar în numele lui).
create policy reports_insert_own
  on reports for insert
  with check ((select auth.uid()) = reporter_id);

-- Doar adminul vede și procesează rapoartele.
create policy reports_select_admin
  on reports for select
  using (
    exists (select 1 from profiles where profiles.id = (select auth.uid()) and profiles.is_admin)
  );

create policy reports_update_admin
  on reports for update
  using (
    exists (select 1 from profiles where profiles.id = (select auth.uid()) and profiles.is_admin)
  )
  with check (
    exists (select 1 from profiles where profiles.id = (select auth.uid()) and profiles.is_admin)
  );

-- ============================================================
-- 2. Blocări între utilizatori
-- ============================================================
create table blocked_users (
  blocker_id uuid not null references profiles(id) on delete cascade,
  blocked_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create index idx_blocked_users_blocked on blocked_users (blocked_id);

alter table blocked_users enable row level security;

-- Fiecare își gestionează propriile blocări (vede/creează/șterge).
create policy blocked_users_all_own
  on blocked_users for all
  using ((select auth.uid()) = blocker_id)
  with check ((select auth.uid()) = blocker_id);

-- ============================================================
-- 3. Aplicare la nivel de DB: o pereche blocată nu-și mai poate
--    trimite mesaje (în niciun sens), indiferent de client.
-- ============================================================
drop policy "Participants send messages" on messages;

create policy "Participants send messages"
  on messages for insert
  with check (
    (select auth.uid()) = sender_id
    and exists (
      select 1 from conversations c
      where c.id = messages.conversation_id
        and (c.buyer_id = (select auth.uid()) or c.seller_id = (select auth.uid()))
    )
    and not exists (
      select 1
      from conversations c
      join blocked_users b
        on (b.blocker_id = c.buyer_id and b.blocked_id = c.seller_id)
        or (b.blocker_id = c.seller_id and b.blocked_id = c.buyer_id)
      where c.id = messages.conversation_id
    )
  );

-- ============================================================
-- 4. Adminul poate dezactiva anunțuri raportate (takedown).
--    Politica UPDATE existentă (doar proprietar + status activ) e
--    înlocuită cu una combinată proprietar-sau-admin, ca să nu
--    reintroducem avertismentul "multiple permissive policies".
-- ============================================================
drop policy "Users can update own items" on items;

create policy "Users can update own items"
  on items for update
  using (
    ((select auth.uid()) = user_id and status = 'active'::text)
    or exists (select 1 from profiles where profiles.id = (select auth.uid()) and profiles.is_admin)
  )
  with check (
    (select auth.uid()) = user_id
    or exists (select 1 from profiles where profiles.id = (select auth.uid()) and profiles.is_admin)
  );
