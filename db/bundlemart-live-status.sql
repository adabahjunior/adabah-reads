-- Live delivery status + clearer support fields
alter table public.system_settings
  add column if not exists estimated_delivery_minutes int not null default 15;

alter table public.system_settings
  add column if not exists support_whatsapp_number text not null default '';

-- Backfill WhatsApp number from existing customer_service_number when empty
update public.system_settings
set support_whatsapp_number = customer_service_number
where coalesce(support_whatsapp_number, '') = ''
  and coalesce(customer_service_number, '') <> '';

create or replace function public.get_delivery_status()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  last_at timestamptz;
  eta int;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select max(created_at) into last_at from public.orders;
  select estimated_delivery_minutes into eta from public.system_settings where id = 1;

  return jsonb_build_object(
    'last_order_at', last_at,
    'estimated_delivery_minutes', coalesce(eta, 15),
    'server_now', now()
  );
end;
$$;

grant execute on function public.get_delivery_status() to authenticated;
