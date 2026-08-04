-- Allow resellers to submit top-up requests (insert only, own rows, topup_request type)
drop policy if exists "wallet tx insert own request" on public.wallet_transactions;
create policy "wallet tx insert own request" on public.wallet_transactions
  for insert to authenticated
  with check (
    reseller_id = auth.uid()
    and type = 'topup_request'
  );

-- Admins can update wallet transaction notes (e.g. mark top-up requests approved)
drop policy if exists "wallet tx admin update" on public.wallet_transactions;
create policy "wallet tx admin update" on public.wallet_transactions
  for update to authenticated
  using (public.has_role('admin'))
  with check (public.has_role('admin'));
