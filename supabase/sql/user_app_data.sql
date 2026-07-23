-- Correr en el SQL Editor del proyecto correcto (prefijo bpgv...).
-- Copia de respaldo/sincronización del AppData local completo (contactos, eventos, rounds,
-- invitations, templates, gastos, settlements), una fila por identidad. Sirve para que un
-- dispositivo recién vinculado a la misma identidad (ver device_link_codes.sql) traiga los
-- mismos datos en vez de arrancar vacío. "Último que escribe gana" a nivel de todo el
-- documento, sin merge campo por campo — decisión explícita, ver planned-device-key-auth.

create table if not exists public.user_app_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.user_app_data enable row level security;

drop policy if exists "user can read own app data" on public.user_app_data;
create policy "user can read own app data"
  on public.user_app_data for select
  using (auth.uid() = user_id);

drop policy if exists "user can insert own app data" on public.user_app_data;
create policy "user can insert own app data"
  on public.user_app_data for insert
  with check (auth.uid() = user_id);

drop policy if exists "user can update own app data" on public.user_app_data;
create policy "user can update own app data"
  on public.user_app_data for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
