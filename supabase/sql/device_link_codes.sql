-- Correr en el SQL Editor del proyecto correcto (prefijo bpgv...).
-- Códigos de un solo uso, de vida corta, para vincular un dispositivo nuevo a una identidad
-- ya autenticada (estilo "WhatsApp Web"): el dispositivo ya logueado genera un código acá;
-- el dispositivo nuevo se lo manda a la Edge Function pubkey-auth junto con su propia pubkey,
-- que -si el código es válido- la ata al mismo user_id en vez de crear un usuario nuevo.

create table if not exists public.device_link_codes (
  code text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at timestamptz
);

alter table public.device_link_codes enable row level security;
-- Sin policies de lectura/escritura directas: solo la Edge Function (service_role) y la RPC
-- de abajo (security definer) tocan esta tabla. El dispositivo que genera el código nunca
-- necesita leerlo de vuelta.

create or replace function public.create_device_link_code()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  new_code text;
begin
  if auth.uid() is null then
    raise exception 'No hay sesión activa.';
  end if;

  new_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));

  insert into public.device_link_codes (code, user_id, expires_at)
  values (new_code, auth.uid(), now() + interval '10 minutes');

  return new_code;
end;
$$;

grant execute on function public.create_device_link_code() to authenticated;
