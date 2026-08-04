-- BundleMart schema for ADABAH4SRC AI
-- Roles: admin | reseller | user

create extension if not exists pgcrypto;

do $$ begin
  create type public.app_role as enum ('admin', 'reseller', 'user');
exception when duplicate_object then null;
end $$;

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  phone text not null default '',
  email text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  unique (user_id, role)
);

create table if not exists public.wallets (
  id uuid primary key default gen_random_uuid(),
  reseller_id uuid not null unique references auth.users(id) on delete cascade,
  balance numeric not null default 0,
  total_profit numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  reseller_id uuid not null references auth.users(id) on delete cascade,
  type text not null default 'topup',
  amount numeric not null,
  reference text,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists public.packages (
  id uuid primary key default gen_random_uuid(),
  network text not null check (network in ('MTN', 'Telecel', 'AirtelTigo')),
  package_size text not null,
  public_price numeric not null default 0,
  reseller_price numeric not null default 0,
  is_unavailable boolean not null default false,
  validity text not null default 'No Expiry',
  updated_at timestamptz not null default now(),
  unique (network, package_size)
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  reseller_id uuid references auth.users(id) on delete set null,
  customer_phone text not null default '',
  network text,
  package_size text,
  amount numeric not null default 0,
  profit numeric not null default 0,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'completed', 'failed')),
  order_type text not null default 'data',
  failure_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists orders_reseller_created_idx
  on public.orders (reseller_id, created_at desc);

create table if not exists public.withdrawals (
  id uuid primary key default gen_random_uuid(),
  reseller_id uuid not null references auth.users(id) on delete cascade,
  amount numeric not null,
  momo_number text not null default '',
  momo_network text not null default '',
  momo_name text not null default '',
  status text not null default 'pending'
    check (status in ('pending', 'completed', 'failed')),
  failure_reason text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.reseller_stores (
  id uuid primary key default gen_random_uuid(),
  reseller_id uuid not null unique references auth.users(id) on delete cascade,
  store_name text not null default '',
  store_description text not null default '',
  support_phone text not null default '',
  whatsapp_link text not null default '',
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.system_settings (
  id int primary key default 1 check (id = 1),
  disable_ordering boolean not null default false,
  holiday_mode_enabled boolean not null default false,
  holiday_message text not null default '',
  customer_service_number text not null default '',
  support_channel_link text not null default '',
  updated_at timestamptz not null default now()
);

insert into public.system_settings (id) values (1) on conflict (id) do nothing;

create or replace function public.has_role(_role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid() and role = _role
  );
$$;

create or replace function public.get_my_roles()
returns setof public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.user_roles where user_id = auth.uid();
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'phone', ''),
    coalesce(new.email, '')
  )
  on conflict (id) do update set
    email = excluded.email,
    updated_at = now();

  insert into public.user_roles (user_id, role)
  values (new.id, 'reseller')
  on conflict (user_id, role) do nothing;

  insert into public.wallets (reseller_id)
  values (new.id)
  on conflict (reseller_id) do nothing;

  insert into public.reseller_stores (reseller_id, store_name)
  values (new.id, coalesce(nullif(new.raw_user_meta_data->>'full_name',''), 'My Store'))
  on conflict (reseller_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

insert into public.packages (network, package_size, public_price, reseller_price, validity)
values
  ('MTN', '1GB', 6.00, 4.50, 'No Expiry'),
  ('MTN', '2GB', 12.00, 9.00, 'No Expiry'),
  ('MTN', '5GB', 28.00, 22.00, 'No Expiry'),
  ('MTN', '10GB', 50.00, 40.00, 'No Expiry'),
  ('Telecel', '1GB', 5.50, 4.20, 'No Expiry'),
  ('Telecel', '2GB', 11.00, 8.50, 'No Expiry'),
  ('Telecel', '5GB', 26.00, 20.00, 'No Expiry'),
  ('AirtelTigo', '1GB', 5.00, 3.80, 'No Expiry'),
  ('AirtelTigo', '2GB', 10.00, 7.80, 'No Expiry'),
  ('AirtelTigo', '5GB', 24.00, 18.50, 'No Expiry')
on conflict (network, package_size) do update set
  public_price = excluded.public_price,
  reseller_price = excluded.reseller_price,
  validity = excluded.validity,
  updated_at = now();

create or replace function public.assign_user_role(_user_id uuid, _role public.app_role)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_role('admin') then
    raise exception 'Only admins can assign roles';
  end if;
  insert into public.user_roles (user_id, role)
  values (_user_id, _role)
  on conflict (user_id, role) do nothing;

  if _role = 'reseller' then
    insert into public.wallets (reseller_id) values (_user_id)
    on conflict (reseller_id) do nothing;
  end if;
end;
$$;

create or replace function public.remove_user_role(_user_id uuid, _role public.app_role)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_role('admin') then
    raise exception 'Only admins can remove roles';
  end if;
  if _role = 'admin' and _user_id = auth.uid() then
    raise exception 'Cannot remove your own admin role';
  end if;
  delete from public.user_roles where user_id = _user_id and role = _role;
end;
$$;

create or replace function public.create_wallet_order(
  _phone text,
  _network text,
  _package_size text
)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  pkg public.packages%rowtype;
  wallet public.wallets%rowtype;
  sell_price numeric;
  cost numeric;
  profit numeric;
  new_order public.orders%rowtype;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  if not (public.has_role('reseller') or public.has_role('admin')) then
    raise exception 'Reseller role required';
  end if;

  select * into pkg from public.packages
  where network = _network and package_size = _package_size and is_unavailable = false;
  if not found then raise exception 'Package unavailable'; end if;

  cost := pkg.reseller_price;
  sell_price := pkg.public_price;
  profit := greatest(sell_price - cost, 0);

  select * into wallet from public.wallets where reseller_id = auth.uid() for update;
  if not found then raise exception 'Wallet not found'; end if;
  if wallet.balance < cost then raise exception 'Insufficient wallet balance'; end if;

  update public.wallets
  set balance = balance - cost,
      total_profit = total_profit + profit,
      updated_at = now()
  where reseller_id = auth.uid();

  insert into public.wallet_transactions (reseller_id, type, amount, description)
  values (auth.uid(), 'purchase', -cost, _network || ' ' || _package_size || ' → ' || _phone);

  insert into public.orders (
    reseller_id, customer_phone, network, package_size, amount, profit, status
  ) values (
    auth.uid(), _phone, _network, _package_size, cost, profit, 'completed'
  )
  returning * into new_order;

  return new_order;
end;
$$;

create or replace function public.request_withdrawal(
  _amount numeric,
  _momo_number text,
  _momo_network text,
  _momo_name text
)
returns public.withdrawals
language plpgsql
security definer
set search_path = public
as $$
declare
  wallet public.wallets%rowtype;
  pending_count int;
  w public.withdrawals%rowtype;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  if _amount < 10 then raise exception 'Minimum withdrawal is GH₵10'; end if;

  select count(*) into pending_count from public.withdrawals
  where reseller_id = auth.uid() and status = 'pending';
  if pending_count > 0 then raise exception 'You already have a pending withdrawal'; end if;

  select * into wallet from public.wallets where reseller_id = auth.uid() for update;
  if wallet.total_profit < _amount then raise exception 'Insufficient profit balance'; end if;

  update public.wallets
  set total_profit = total_profit - _amount, updated_at = now()
  where reseller_id = auth.uid();

  insert into public.withdrawals (reseller_id, amount, momo_number, momo_network, momo_name)
  values (auth.uid(), _amount, _momo_number, _momo_network, _momo_name)
  returning * into w;

  return w;
end;
$$;

create or replace function public.admin_topup_wallet(_reseller_id uuid, _amount numeric, _note text default 'Admin top-up')
returns public.wallets
language plpgsql
security definer
set search_path = public
as $$
declare
  w public.wallets%rowtype;
begin
  if not public.has_role('admin') then raise exception 'Admin only'; end if;
  if _amount = 0 then raise exception 'Amount required'; end if;

  insert into public.wallets (reseller_id) values (_reseller_id)
  on conflict (reseller_id) do nothing;

  update public.wallets
  set balance = balance + _amount, updated_at = now()
  where reseller_id = _reseller_id
  returning * into w;

  insert into public.wallet_transactions (reseller_id, type, amount, description)
  values (_reseller_id, 'topup', _amount, coalesce(_note, 'Admin top-up'));

  return w;
end;
$$;

create or replace function public.admin_complete_withdrawal(_withdrawal_id uuid, _approve boolean, _reason text default '')
returns public.withdrawals
language plpgsql
security definer
set search_path = public
as $$
declare
  w public.withdrawals%rowtype;
begin
  if not public.has_role('admin') then raise exception 'Admin only'; end if;

  select * into w from public.withdrawals where id = _withdrawal_id for update;
  if not found then raise exception 'Withdrawal not found'; end if;
  if w.status <> 'pending' then raise exception 'Already processed'; end if;

  if _approve then
    update public.withdrawals
    set status = 'completed', completed_at = now(), updated_at = now()
    where id = _withdrawal_id
    returning * into w;
  else
    update public.wallets
    set total_profit = total_profit + w.amount, updated_at = now()
    where reseller_id = w.reseller_id;

    update public.withdrawals
    set status = 'failed', failure_reason = coalesce(nullif(_reason,''), 'Rejected'), updated_at = now()
    where id = _withdrawal_id
    returning * into w;
  end if;

  return w;
end;
$$;

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.wallets enable row level security;
alter table public.wallet_transactions enable row level security;
alter table public.packages enable row level security;
alter table public.orders enable row level security;
alter table public.withdrawals enable row level security;
alter table public.reseller_stores enable row level security;
alter table public.system_settings enable row level security;

drop policy if exists "profiles select own or admin" on public.profiles;
create policy "profiles select own or admin" on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.has_role('admin'));

drop policy if exists "profiles update own" on public.profiles;
create policy "profiles update own" on public.profiles
  for update to authenticated
  using (id = auth.uid() or public.has_role('admin'))
  with check (id = auth.uid() or public.has_role('admin'));

drop policy if exists "roles select own or admin" on public.user_roles;
create policy "roles select own or admin" on public.user_roles
  for select to authenticated
  using (user_id = auth.uid() or public.has_role('admin'));

drop policy if exists "wallets select own or admin" on public.wallets;
create policy "wallets select own or admin" on public.wallets
  for select to authenticated
  using (reseller_id = auth.uid() or public.has_role('admin'));

drop policy if exists "wallet tx select own or admin" on public.wallet_transactions;
create policy "wallet tx select own or admin" on public.wallet_transactions
  for select to authenticated
  using (reseller_id = auth.uid() or public.has_role('admin'));

drop policy if exists "packages read auth" on public.packages;
create policy "packages read auth" on public.packages
  for select to authenticated using (true);

drop policy if exists "packages admin write" on public.packages;
create policy "packages admin write" on public.packages
  for all to authenticated
  using (public.has_role('admin'))
  with check (public.has_role('admin'));

drop policy if exists "orders select own or admin" on public.orders;
create policy "orders select own or admin" on public.orders
  for select to authenticated
  using (reseller_id = auth.uid() or public.has_role('admin'));

drop policy if exists "orders admin update" on public.orders;
create policy "orders admin update" on public.orders
  for update to authenticated
  using (public.has_role('admin'))
  with check (public.has_role('admin'));

drop policy if exists "withdrawals select own or admin" on public.withdrawals;
create policy "withdrawals select own or admin" on public.withdrawals
  for select to authenticated
  using (reseller_id = auth.uid() or public.has_role('admin'));

drop policy if exists "stores select own or admin or published" on public.reseller_stores;
create policy "stores select own or admin or published" on public.reseller_stores
  for select to authenticated
  using (reseller_id = auth.uid() or public.has_role('admin') or is_published = true);

drop policy if exists "stores update own" on public.reseller_stores;
create policy "stores update own" on public.reseller_stores
  for update to authenticated
  using (reseller_id = auth.uid() or public.has_role('admin'))
  with check (reseller_id = auth.uid() or public.has_role('admin'));

drop policy if exists "settings read auth" on public.system_settings;
create policy "settings read auth" on public.system_settings
  for select to authenticated using (true);

drop policy if exists "settings admin write" on public.system_settings;
create policy "settings admin write" on public.system_settings
  for all to authenticated
  using (public.has_role('admin'))
  with check (public.has_role('admin'));

grant usage on schema public to authenticated;
grant select, insert, update on all tables in schema public to authenticated;
grant execute on function public.get_my_roles() to authenticated;
grant execute on function public.has_role(public.app_role) to authenticated;
grant execute on function public.assign_user_role(uuid, public.app_role) to authenticated;
grant execute on function public.remove_user_role(uuid, public.app_role) to authenticated;
grant execute on function public.create_wallet_order(text, text, text) to authenticated;
grant execute on function public.request_withdrawal(numeric, text, text, text) to authenticated;
grant execute on function public.admin_topup_wallet(uuid, numeric, text) to authenticated;
grant execute on function public.admin_complete_withdrawal(uuid, boolean, text) to authenticated;
