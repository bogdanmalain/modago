-- Vânzătorii puteau cere retragere de bani, dar adminul nu avea nicio
-- vizibilitate asupra cererilor — nimic în aplicație, nimic în panoul
-- admin. Adăugăm acces admin (select + update) pe withdrawal_requests,
-- plus posibilitatea ca adminul să trimită o notificare in-app userului
-- când procesează cererea (paid/rejected).

create policy withdrawal_requests_select_admin
  on withdrawal_requests for select
  using (
    exists (select 1 from profiles where profiles.id = (select auth.uid()) and profiles.is_admin)
  );

create policy withdrawal_requests_update_admin
  on withdrawal_requests for update
  using (
    exists (select 1 from profiles where profiles.id = (select auth.uid()) and profiles.is_admin)
  )
  with check (
    exists (select 1 from profiles where profiles.id = (select auth.uid()) and profiles.is_admin)
  );

create policy notifications_insert_admin
  on notifications for insert
  with check (
    exists (select 1 from profiles where profiles.id = (select auth.uid()) and profiles.is_admin)
  );
