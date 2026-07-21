-- Correr esto una vez en el SQL editor del proyecto de Supabase (Dashboard -> SQL Editor).
-- Soporta el login por keypair de dispositivo: mapea el hash de una clave pública a un
-- auth.users existente, y guarda desafíos (nonces) de un solo uso para evitar replay attacks.
-- Ninguna de las dos tablas tiene policies de RLS -> solo la service_role (usada por la
-- Edge Function pubkey-auth) puede leerlas o escribirlas; anon/authenticated no ven nada.

create table if not exists public.user_pubkeys (
  pubkey_hash text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.auth_nonces (
  nonce text primary key,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

alter table public.user_pubkeys enable row level security;
alter table public.auth_nonces enable row level security;
