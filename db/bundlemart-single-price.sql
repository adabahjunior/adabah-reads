-- Single admin package price for dashboard + API purchases.
-- reseller_price is the canonical price; public_price is kept in sync for compatibility.

update public.packages
set public_price = reseller_price,
    updated_at = now()
where public_price is distinct from reseller_price;

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
  cost numeric;
  new_order public.orders%rowtype;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  if not (public.has_role('reseller') or public.has_role('admin')) then
    raise exception 'Reseller role required';
  end if;

  if _phone !~ '^0[0-9]{9}$' then
    raise exception 'Phone must be 10 digits starting with 0';
  end if;

  select * into pkg from public.packages
  where network = _network and package_size = _package_size and is_unavailable = false;
  if not found then raise exception 'Package unavailable'; end if;

  cost := pkg.reseller_price;

  select * into wallet from public.wallets where reseller_id = auth.uid() for update;
  if not found then raise exception 'Wallet not found'; end if;
  if wallet.balance < cost then raise exception 'Insufficient wallet balance'; end if;

  update public.wallets
  set balance = balance - cost,
      updated_at = now()
  where reseller_id = auth.uid();

  insert into public.wallet_transactions (reseller_id, type, amount, description)
  values (auth.uid(), 'purchase', -cost, _network || ' ' || _package_size || ' → ' || _phone);

  insert into public.orders (
    reseller_id, customer_phone, network, package_size, amount, profit, status
  ) values (
    auth.uid(), _phone, _network, _package_size, cost, 0, 'completed'
  )
  returning * into new_order;

  return new_order;
end;
$$;

create or replace function public.api_list_packages(_raw_key text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid;
begin
  uid := public.resolve_api_key(_raw_key);

  return coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'network', network,
          'package_size', package_size,
          'price', reseller_price,
          'reseller_price', reseller_price,
          'sell_price', reseller_price,
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

  select * into wallet from public.wallets where reseller_id = uid for update;
  if not found then raise exception 'Wallet not found'; end if;
  if wallet.balance < cost then raise exception 'Insufficient wallet balance'; end if;

  update public.wallets
  set balance = balance - cost,
      updated_at = now()
  where reseller_id = uid;

  insert into public.wallet_transactions (reseller_id, type, amount, description)
  values (uid, 'purchase', -cost, 'API · ' || _network || ' ' || _package_size || ' → ' || _phone);

  insert into public.orders (
    reseller_id, customer_phone, network, package_size, amount, profit, status, order_type
  ) values (
    uid, _phone, _network, _package_size, cost, 0, 'completed', 'api'
  )
  returning * into new_order;

  return jsonb_build_object(
    'id', new_order.id,
    'status', new_order.status,
    'network', new_order.network,
    'package_size', new_order.package_size,
    'customer_phone', new_order.customer_phone,
    'amount', new_order.amount,
    'price', new_order.amount,
    'created_at', new_order.created_at
  );
end;
$$;

grant execute on function public.create_wallet_order(text, text, text) to authenticated;
grant execute on function public.api_list_packages(text) to anon, authenticated, service_role;
grant execute on function public.api_place_order(text, text, text, text) to anon, authenticated, service_role;
