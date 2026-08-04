-- Unique 4-digit top-up codes + admin wallet adjust / API key management

alter table public.profiles
  add column if not exists topup_code text;

create unique index if not exists profiles_topup_code_uidx
  on public.profiles (topup_code)
  where topup_code is not null;

create or replace function public.generate_topup_code()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  candidate text;
  attempts int := 0;
begin
  loop
    attempts := attempts + 1;
    if attempts > 50 then
      raise exception 'Could not allocate unique top-up code';
    end if;
    candidate := lpad((floor(random() * 10000))::int::text, 4, '0');
    exit when not exists (
      select 1 from public.profiles where topup_code = candidate
    );
  end loop;
  return candidate;
end;
$$;

-- Assign codes to existing profiles missing one
do $$
declare
  r record;
begin
  for r in select id from public.profiles where topup_code is null loop
    update public.profiles
    set topup_code = public.generate_topup_code(), updated_at = now()
    where id = r.id;
  end loop;
end $$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone, email, topup_code)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'phone', ''),
    coalesce(new.email, ''),
    public.generate_topup_code()
  )
  on conflict (id) do update set
    email = excluded.email,
    topup_code = coalesce(public.profiles.topup_code, excluded.topup_code),
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

create or replace function public.admin_find_by_topup_code(_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  cleaned text;
  p public.profiles%rowtype;
  bal numeric;
  profit numeric;
begin
  if not public.has_role('admin') then raise exception 'Admin only'; end if;
  cleaned := lpad(regexp_replace(coalesce(_code, ''), '\D', '', 'g'), 4, '0');
  if length(cleaned) <> 4 then raise exception 'Enter a 4-digit top-up code'; end if;

  select * into p from public.profiles where topup_code = cleaned;
  if not found then raise exception 'No user with code %', cleaned; end if;

  select balance, total_profit into bal, profit
  from public.wallets where reseller_id = p.id;

  return jsonb_build_object(
    'id', p.id,
    'full_name', p.full_name,
    'email', p.email,
    'phone', p.phone,
    'topup_code', p.topup_code,
    'balance', coalesce(bal, 0),
    'total_profit', coalesce(profit, 0)
  );
end;
$$;

create or replace function public.admin_adjust_wallet(
  _reseller_id uuid,
  _amount numeric,
  _note text default 'Admin adjustment'
)
returns public.wallets
language plpgsql
security definer
set search_path = public
as $$
declare
  w public.wallets%rowtype;
  tx_type text;
begin
  if not public.has_role('admin') then raise exception 'Admin only'; end if;
  if _amount = 0 then raise exception 'Amount cannot be zero'; end if;

  insert into public.wallets (reseller_id) values (_reseller_id)
  on conflict (reseller_id) do nothing;

  select * into w from public.wallets where reseller_id = _reseller_id for update;

  if _amount < 0 and w.balance + _amount < 0 then
    raise exception 'Insufficient balance to debit';
  end if;

  update public.wallets
  set balance = balance + _amount, updated_at = now()
  where reseller_id = _reseller_id
  returning * into w;

  tx_type := case when _amount > 0 then 'admin_credit' else 'admin_debit' end;

  insert into public.wallet_transactions (reseller_id, type, amount, description)
  values (_reseller_id, tx_type, _amount, coalesce(nullif(trim(_note), ''), 'Admin adjustment'));

  return w;
end;
$$;

create or replace function public.admin_revoke_api_key(_key_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_role('admin') then raise exception 'Admin only'; end if;

  update public.api_keys
  set revoked_at = now()
  where id = _key_id and revoked_at is null;

  if not found then raise exception 'API key not found or already revoked'; end if;
  return true;
end;
$$;

create or replace function public.admin_rotate_api_key(_key_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  old_key public.api_keys%rowtype;
  raw_key text;
  prefix text;
  hash_hex text;
  row_id uuid;
  created timestamptz;
begin
  if not public.has_role('admin') then raise exception 'Admin only'; end if;

  select * into old_key from public.api_keys where id = _key_id;
  if not found then raise exception 'API key not found'; end if;

  update public.api_keys set revoked_at = now() where id = _key_id and revoked_at is null;

  raw_key := 'bm_live_' || encode(gen_random_bytes(24), 'hex');
  prefix := left(raw_key, 12);
  hash_hex := encode(digest(raw_key, 'sha256'), 'hex');

  insert into public.api_keys (reseller_id, name, key_prefix, key_hash)
  values (old_key.reseller_id, coalesce(old_key.name, 'Default') || ' (rotated)', prefix, hash_hex)
  returning id, created_at into row_id, created;

  return jsonb_build_object(
    'id', row_id,
    'name', coalesce(old_key.name, 'Default') || ' (rotated)',
    'key_prefix', prefix,
    'api_key', raw_key,
    'created_at', created,
    'reseller_id', old_key.reseller_id
  );
end;
$$;

grant execute on function public.generate_topup_code() to authenticated;
grant execute on function public.admin_find_by_topup_code(text) to authenticated;
grant execute on function public.admin_adjust_wallet(uuid, numeric, text) to authenticated;
grant execute on function public.admin_revoke_api_key(uuid) to authenticated;
grant execute on function public.admin_rotate_api_key(uuid) to authenticated;
grant execute on function public.admin_topup_wallet(uuid, numeric, text) to authenticated;
