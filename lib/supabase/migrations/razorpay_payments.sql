-- ============================================================
-- Razorpay Payments
-- AITrade Analyzer
-- ============================================================

create table if not exists public.razorpay_payments (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null references auth.users(id) on delete cascade,

  plan_id text not null,
  plan_name text not null,
  billing_interval text not null,

  razorpay_order_id text not null unique,
  razorpay_payment_id text unique,

  amount integer not null check (amount > 0),
  currency text not null default 'INR',

  status text not null default 'created'
    check (
      status in (
        'created',
        'authorized',
        'captured',
        'failed',
        'refunded',
        'cancelled'
      )
    ),

  payment_method text,

  launch_offer_applied boolean not null default false,

  error_code text,
  error_description text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- Indexes
-- ============================================================

create index if not exists idx_razorpay_payments_user_id
  on public.razorpay_payments(user_id);

create index if not exists idx_razorpay_payments_status
  on public.razorpay_payments(status);

create index if not exists idx_razorpay_payments_created_at
  on public.razorpay_payments(created_at desc);

-- ============================================================
-- Row Level Security
-- ============================================================

alter table public.razorpay_payments enable row level security;

-- Users can view only their own payment records.
drop policy if exists "Users can view own Razorpay payments"
on public.razorpay_payments;

create policy "Users can view own Razorpay payments"
on public.razorpay_payments
for select
to authenticated
using (auth.uid() = user_id);

-- ============================================================
-- Updated-at trigger
-- ============================================================

create or replace function public.update_razorpay_payments_updated_at()
returns trigger
language plpgsql
security invoker
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists razorpay_payments_updated_at
on public.razorpay_payments;

create trigger razorpay_payments_updated_at
before update on public.razorpay_payments
for each row
execute function public.update_razorpay_payments_updated_at();