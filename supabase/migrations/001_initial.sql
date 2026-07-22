-- Migration: 001_initial.sql
-- Live Artist Checkout MVP Database Schema & RLS Policies

create extension if not exists pgcrypto;
create extension if not exists citext;

-- Custom Enums
do $$ begin
  if not exists (select 1 from pg_type where typname = 'artwork_status') then
    create type public.artwork_status as enum ('pending', 'uploaded', 'paid', 'archived');
  end if;
  if not exists (select 1 from pg_type where typname = 'order_type') then
    create type public.order_type as enum ('digital', 'print');
  end if;
  if not exists (select 1 from pg_type where typname = 'payment_status') then
    create type public.payment_status as enum ('unpaid', 'pending', 'paid', 'failed', 'refunded', 'partially_refunded');
  end if;
  if not exists (select 1 from pg_type where typname = 'fulfilment_status') then
    create type public.fulfilment_status as enum ('not_applicable', 'pending', 'submitted', 'in_production', 'shipped', 'delivered', 'failed', 'cancelled');
  end if;
end $$;

-- 1. Artists Table
create table if not exists public.artists (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  email citext not null,
  stripe_account_id text unique,
  stripe_onboarding_complete boolean not null default false,
  default_currency text not null default 'gbp' check (default_currency in ('gbp', 'usd', 'eur')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Events Table
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.artists(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 160),
  event_date date,
  logo_path text,
  slug text not null unique check (slug ~ '^[a-z0-9-]{4,80}$'),
  is_active boolean not null default true,
  digital_price integer not null default 1500 check (digital_price >= 0),
  print_prices jsonb not null default '{"A5":1500,"A4":2200,"A3":3200}',
  currency text not null default 'gbp' check (currency in ('gbp', 'usd', 'eur')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. Customers Table
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  email citext,
  claim_code text not null check (claim_code ~ '^[A-Z0-9]{6}$'),
  claim_token_hash text not null unique,
  consent_marketing boolean not null default false,
  created_at timestamptz not null default now(),
  unique(event_id, claim_code)
);

-- 4. Artworks Table
create table if not exists public.artworks (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null unique references public.customers(id) on delete cascade,
  artist_id uuid not null references public.artists(id) on delete cascade,
  original_path text not null,
  preview_path text,
  mime_type text not null check (mime_type in ('image/png', 'image/jpeg')),
  byte_size integer not null check (byte_size between 1 and 25000000),
  width integer,
  height integer,
  original_ready boolean not null default false,
  status public.artwork_status not null default 'pending',
  uploaded_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

-- 5. Orders Table
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.artists(id) on delete restrict,
  artwork_id uuid not null references public.artworks(id) on delete restrict,
  customer_id uuid not null references public.customers(id) on delete restrict,
  type public.order_type not null,
  product_size text check (product_size in ('A5', 'A4', 'A3')),
  amount integer not null check (amount >= 0),
  currency text not null,
  payment_status public.payment_status not null default 'unpaid',
  fulfilment_status public.fulfilment_status not null default 'not_applicable',
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text,
  stripe_charge_id text,
  prodigi_order_id text unique,
  shipping_address jsonb,
  failure_code text,
  failure_message text,
  idempotency_key text not null unique,
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  updated_at timestamptz not null default now(),
  check ((type = 'digital' and product_size is null) or (type = 'print' and product_size is not null))
);

-- 6. Webhook Events Table
create table if not exists public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('stripe', 'prodigi')),
  external_event_id text not null,
  payload jsonb not null,
  processed_at timestamptz,
  error text,
  created_at timestamptz not null default now(),
  unique(provider, external_event_id)
);

-- Indexes
create index if not exists events_artist_idx on public.events(artist_id, created_at desc);
create index if not exists customers_event_idx on public.customers(event_id, created_at desc);
create index if not exists artworks_artist_status_idx on public.artworks(artist_id, status);
create index if not exists orders_artist_idx on public.orders(artist_id, created_at desc);
create index if not exists orders_prodigi_idx on public.orders(prodigi_order_id) where prodigi_order_id is not null;
create unique index if not exists one_order_per_product on public.orders(artwork_id, type, product_size)
  where payment_status in ('pending', 'paid', 'partially_refunded');

-- Updated_at Trigger Function
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Triggers
drop trigger if exists set_artists_updated_at on public.artists;
create trigger set_artists_updated_at before update on public.artists for each row execute procedure public.handle_updated_at();

drop trigger if exists set_events_updated_at on public.events;
create trigger set_events_updated_at before update on public.events for each row execute procedure public.handle_updated_at();

drop trigger if exists set_orders_updated_at on public.orders;
create trigger set_orders_updated_at before update on public.orders for each row execute procedure public.handle_updated_at();

-- Row Level Security (RLS)
alter table public.artists enable row level security;
alter table public.events enable row level security;
alter table public.customers enable row level security;
alter table public.artworks enable row level security;
alter table public.orders enable row level security;
alter table public.webhook_events enable row level security;

-- Policies
drop policy if exists artists_self on public.artists;
create policy artists_self on public.artists for select using (id = auth.uid());

drop policy if exists artists_update_self on public.artists;
create policy artists_update_self on public.artists for update using (id = auth.uid());

drop policy if exists events_owner_all on public.events;
create policy events_owner_all on public.events for all using (artist_id = auth.uid()) with check (artist_id = auth.uid());

drop policy if exists customers_owner_all on public.customers;
create policy customers_owner_all on public.customers for all using (
  exists (select 1 from public.events e where e.id = event_id and e.artist_id = auth.uid())
) with check (
  exists (select 1 from public.events e where e.id = event_id and e.artist_id = auth.uid())
);

drop policy if exists artworks_owner_all on public.artworks;
create policy artworks_owner_all on public.artworks for all using (artist_id = auth.uid()) with check (artist_id = auth.uid());

drop policy if exists orders_owner_select on public.orders;
create policy orders_owner_select on public.orders for select using (artist_id = auth.uid());
