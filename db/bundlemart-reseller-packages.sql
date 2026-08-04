-- Reseller custom API package pricing (admin base + profit)
create table if not exists public.reseller_packages (
  id uuid primary key default gen_random_uuid(),
  reseller_id uuid not null references auth.users(id) on delete cascade,
  network text not null check (network in ('MTN', 'Telecel', 'AirtelTigo')),
  package_size text not null,
  base_price numeric not null default 0,
  profit numeric not null default 0 check (profit >= 0),
  sell_price numeric not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (reseller_id, network, package_size)
);

create index if not exists reseller_packages_reseller_idx
  on public.reseller_packages (reseller_id);

alter table public.reseller_packages enable row level security;

drop policy if exists "reseller packages select own" on public.reseller_packages;
create policy "reseller packages select own" on public.reseller_packages
  for select to authenticated
  using (reseller_id = auth.uid() or public.has_role('admin'));

drop policy if exists "reseller packages write own" on public.reseller_packages;
create policy "reseller packages write own" on public.reseller_packages
  for all to authenticated
  using (reseller_id = auth.uid() or public.has_role('admin'))
  with check (reseller_id = auth.uid() or public.has_role('admin'));

create or replace function public.upsert_reseller_package(
  _network text,
  _package_size text,
  _profit numeric
)
returns public.reseller_packages
language plpgsql
security definer
set search_path = public
as $$
declare
  base numeric;
  row public.reseller_packages%rowtype;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  if not (public.has_role('reseller') or public.has_role('admin')) then
    raise exception 'Reseller role required';
  end if;
  if _profit is null or _profit < 0 then
    raise exception 'Profit must be zero or greater';
  end if;

  select reseller_price into base
  from public.packages
  where network = _network
    and package_size = _package_size
    and is_unavailable = false;

  if base is null then
    raise exception 'Admin package not found or unavailable';
  end if;

  insert into public.reseller_packages (
    reseller_id, network, package_size, base_price, profit, sell_price, is_active, updated_at
  ) values (
    auth.uid(), _network, _package_size, base, _profit, base + _profit, true, now()
  )
  on conflict (reseller_id, network, package_size) do update
    set base_price = excluded.base_price,
        profit = excluded.profit,
        sell_price = excluded.sell_price,
        is_active = true,
        updated_at = now()
  returning * into row;

  return row;
end;
$$;

create or replace function public.deactivate_reseller_package(
  _network text,
  _package_size text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;

  update public.reseller_packages
  set is_active = false, updated_at = now()
  where reseller_id = auth.uid()
    and network = _network
    and package_size = _package_size;

  return found;
end;
$$;

-- API packages: prefer reseller sell prices when configured
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
          'network', p.network,
          'package_size', p.package_size,
          'base_price', p.reseller_price,
          'profit', coalesce(rp.profit, 0),
          'sell_price', coalesce(rp.sell_price, p.reseller_price),
          'reseller_price', coalesce(rp.sell_price, p.reseller_price),
          'public_price', p.public_price,
          'validity', p.validity,
          'customized', rp.id is not null and rp.is_active
        )
        order by p.network, p.reseller_price
      )
      from public.packages p
      left join public.reseller_packages rp
        on rp.reseller_id = uid
       and rp.network = p.network
       and rp.package_size = p.package_size
       and rp.is_active = true
      where p.is_unavailable = false
    ),
    '[]'::jsonb
  );
end;
$$;

create or replace function public.track_orders_by_phone(_phone text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  cleaned text;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;

  cleaned := regexp_replace(trim(_phone), '[^0-9+]', '', 'g');
  if cleaned ~ '^\+?233[0-9]{9}$' then
    cleaned := '0' || right(cleaned, 9);
  end if;

  if cleaned !~ '^0[0-9]{9}$' then
    raise exception 'Enter a valid Ghana number (10 digits starting with 0)';
  end if;

  return coalesce(
    (
      select jsonb_agg(row_to_json(o)::jsonb)
      from (
        select
          id,
          customer_phone,
          network,
          package_size,
          amount,
          status,
          failure_reason,
          created_at,
          updated_at
        from public.orders
        where reseller_id = auth.uid()
          and customer_phone = cleaned
        order by created_at desc
        limit 50
      ) o
    ),
    '[]'::jsonb
  );
end;
$$;

grant select, insert, update, delete on public.reseller_packages to authenticated;
grant execute on function public.upsert_reseller_package(text, text, numeric) to authenticated;
grant execute on function public.deactivate_reseller_package(text, text) to authenticated;
grant execute on function public.api_list_packages(text) to anon, authenticated, service_role;
grant execute on function public.track_orders_by_phone(text) to authenticated;
