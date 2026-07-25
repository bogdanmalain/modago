-- Flux de retur obligatoriu înainte de rambursare completă:
-- admin cere returul produsului, cumpărătorul trimite AWB + cost,
-- vânzătorul confirmă primirea (sau adminul forțează), abia atunci
-- se declanșează rambursarea + costul AWB-ului e scăzut din soldul
-- vânzătorului (nu suportă cumpărătorul acest cost, dacă vânzătorul
-- a fost cel vinovat).

alter table disputes add column if not exists return_stage text
  not null default 'none'
  check (return_stage in ('none', 'awaiting_return', 'shipped', 'received'));

alter table disputes add column if not exists return_tracking_number text;

alter table disputes add column if not exists return_shipping_cost_mdl numeric
  check (return_shipping_cost_mdl is null or return_shipping_cost_mdl >= 0);

alter table disputes add column if not exists return_shipped_at timestamptz;
alter table disputes add column if not exists return_received_at timestamptz;

-- Cumpărătorul adaugă AWB-ul de retur + costul plătit, cât timp
-- adminul a marcat disputa 'awaiting_return'. Tranziția e validată prin
-- with_check: doar spre 'shipped', cu tracking+cost completate.
create policy disputes_update_buyer_return
  on disputes for update
  using (auth.uid() = opened_by and return_stage = 'awaiting_return')
  with check (
    auth.uid() = opened_by
    and return_stage = 'shipped'
    and return_tracking_number is not null
    and return_shipping_cost_mdl is not null
  );

-- Ledger de ajustări de sold (ex: deducere cost AWB retur de la vânzător
-- vinovat). Scris doar de edge functions (service role) — niciun user
-- nu poate insera direct, doar citi propriile ajustări.
create table if not exists public.balance_adjustments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  order_id uuid references public.orders(id),
  amount_mdl numeric not null,
  reason text not null,
  created_at timestamptz not null default now()
);

alter table public.balance_adjustments enable row level security;

create policy balance_adjustments_select_own
  on public.balance_adjustments for select
  using (user_id = auth.uid());
