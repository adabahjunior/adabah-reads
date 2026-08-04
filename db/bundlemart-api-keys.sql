-- Reseller API keys for BundleMart public API
create extension if not exists pgcrypto;

create table if not exists public.api_keys (
  id uuid primary key default gen_random_uuid(),
  reseller_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'Default',
  key_prefix text not null,
  key_hash text not null unique,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);

create index if not exists api_keys_reseller_idx on public.api_keys (reseller_id);

alter table public.api_keys enable row level security;

drop policy if exists "api keys select own" on public.api_keys;
create policy "api keys select own" on public.api_keys
  for select to authenticated
  using (reseller_id = auth.uid() or public.has_role('admin'));

create or replace function public.create_api_key(_name text default 'Default')
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  raw_key text;
  prefix text;
  hash_hex text;
  row_id uuid;
  created timestamptz;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  if not (public.has_role('reseller') or public.has_role('admin')) then
    raise exception 'Reseller role required';
  end if;

  raw_key := 'bm_live_' || encode(gen_random_bytes(24), 'hex');
  prefix := left(raw_key, 12);
  hash_hex := encode(digest(raw_key, 'sha256'), 'hex');

  insert into public.api_keys (reseller_id, name, key_prefix, key_hash)
  values (auth.uid(), coalesce(nullif(trim(_name), ''), 'Default'), prefix, hash_hex)
  returning id, created_at into row_id, created;

  return jsonb_build_object(
    'id', row_id,
    'name', coalesce(nullif(trim(_name), ''), 'Default'),
    'key_prefix', prefix,
    'api_key', raw_key,
    'created_at', created
  );
end;
$$;

create or replace function public.revoke_api_key(_key_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;

  update public.api_keys
  set revoked_at = now()
  where id = _key_id
    and reseller_id = auth.uid()
    and revoked_at is null;

  if not found then raise exception 'API key not found'; end if;
  return true;
end;
$$;

create or replace function public.resolve_api_key(_raw_key text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  hash_hex text;
  owner uuid;
begin
  if _raw_key is null or length(_raw_key) < 20 then
    raise exception 'Invalid API key';
  end if;

  hash_hex := encode(digest(_raw_key, 'sha256'), 'hex');

  update public.api_keys
  set last_used_at = now()
  where key_hash = hash_hex and revoked_at is null
  returning reseller_id into owner;

  if owner is null then raise exception 'Invalid API key'; end if;
  return owner;
end;
$$;

create or replace function public.api_get_balance(_raw_key text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid;
  bal numeric;
begin
  uid := public.resolve_api_key(_raw_key);
  select balance into bal from public.wallets where reseller_id = uid;
  return jsonb_build_object('balance', coalesce(bal, 0), 'currency', 'GHS');
end;
$$;

create or replace function public.api_list_packages(_raw_key text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.resolve_api_key(_raw_key);
  return coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'network', network,
          'package_size', package_size,
          'reseller_price', reseller_price,
          'public_price', public_price,
          'validity', validity
        )
        order by network, reseller_price
      )
      from public.packages
      where is_unavailable = false
    ),
    '[]'::jsonb
  );
end;
$$;

create or replace function public.api_place_order(
  _raw_key text,
  _phone text,
  _network text,
  _package_size text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid;
  pkg public.packages%rowtype;
  wallet public.wallets%rowtype;
  cost numeric;
  profit numeric;
  new_order public.orders%rowtype;
begin
  uid := public.resolve_api_key(_raw_key);

  if _phone !~ '^0[0-9]{9}$' then
    raise exception 'Phone must be 10 digits starting with 0';
  end if;

  select * into pkg from public.packages
  where network = _network and package_size = _package_size and is_unavailable = false;
  if not found then raise exception 'Package unavailable'; end if;

  cost := pkg.reseller_price;
  profit := greatest(pkg.public_price - cost, 0);

  select * into wallet from public.wallets where reseller_id = uid for update;
  if not found then raise exception 'Wallet not found'; end if;
  if wallet.balance < cost then raise exception 'Insufficient wallet balance'; end if;

  update public.wallets
  set balance = balance - cost,
      total_profit = total_profit + profit,
      updated_at = now()
  where reseller_id = uid;

  insert into public.wallet_transactions (reseller_id, type, amount, description)
  values (uid, 'purchase', -cost, 'API · ' || _network || ' ' || _package_size || ' → ' || _phone);

  insert into public.orders (
    reseller_id, customer_phone, network, package_size, amount, profit, status, order_type
  ) values (
    uid, _phone, _network, _package_size, cost, profit, 'completed', 'api'
  )
  returning * into new_order;

  return jsonb_build_object(
    'id', new_order.id,
    'status', new_order.status,
    'network', new_order.network,
    'package_size', new_order.package_size,
    'customer_phone', new_order.customer_phone,
    'amount', new_order.amount,
    'created_at', new_order.created_at
  );
end;
$$;

create or replace function public.api_list_orders(_raw_key text, _limit int default 20)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid;
  lim int;
begin
  uid := public.resolve_api_key(_raw_key);
  lim := least(greatest(coalesce(_limit, 20), 1), 100);

  return coalesce(
    (
      select jsonb_agg(row_to_json(o)::jsonb)
      from (
        select id, customer_phone, network, package_size, amount, status, created_at
        from public.orders
        where reseller_id = uid
        order by created_at desc
        limit lim
      ) o
    ),
    '[]'::jsonb
  );
end;
$$;

grant select on public.api_keys to authenticated;
grant execute on function public.create_api_key(text) to authenticated;
grant execute on function public.revoke_api_key(uuid) to authenticated;
grant execute on function public.resolve_api_key(text) to anon, authenticated, service_role;
grant execute on function public.api_get_balance(text) to anon, authenticated, service_role;
grant execute on function public.api_list_packages(text) to anon, authenticated, service_role;
grant execute on function public.api_place_order(text, text, text, text) to anon, authenticated, service_role;
grant execute on function public.api_list_orders(text, int) to anon, authenticated, service_role;
