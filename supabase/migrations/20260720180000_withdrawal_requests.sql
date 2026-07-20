create type withdrawal_status as enum ('pending', 'paid', 'rejected');

create table withdrawal_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount_mdl numeric not null check (amount_mdl > 0),
  card_holder_name text not null,
  card_number_last4 text not null,
  iban text not null,
  status withdrawal_status not null default 'pending',
  admin_note text,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

create index withdrawal_requests_user_id_idx on withdrawal_requests(user_id);

alter table withdrawal_requests enable row level security;

create policy withdrawal_requests_select_owner
  on withdrawal_requests for select
  using (auth.uid() = user_id);

create policy withdrawal_requests_insert_owner
  on withdrawal_requests for insert
  with check (auth.uid() = user_id);
