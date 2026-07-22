-- Correr en el SQL Editor del proyecto correcto (prefijo bpgv...).
-- Publica nombre/teléfono de cada participante de una sala compartida, para poder mostrar
-- "quién juega" antes de aceptar una invitación, y para poder intercambiar contactos al aceptar.

create table if not exists public.event_share_members (
  share_id uuid not null references public.event_shares(id) on delete cascade,
  user_id uuid not null,
  name text not null,
  phone text,
  updated_at timestamptz not null default now(),
  primary key (share_id, user_id)
);

alter table public.event_share_members enable row level security;

drop policy if exists "members can read member profiles of their shares" on public.event_share_members;
create policy "members can read member profiles of their shares"
  on public.event_share_members for select
  using (
    exists (
      select 1 from public.event_shares es
      where es.id = event_share_members.share_id
        and (auth.uid() = any(es.member_user_ids) or auth.uid() = es.created_by)
    )
  );

drop policy if exists "members can upsert their own profile row" on public.event_share_members;
create policy "members can upsert their own profile row"
  on public.event_share_members for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.event_shares es
      where es.id = event_share_members.share_id
        and (auth.uid() = any(es.member_user_ids) or auth.uid() = es.created_by)
    )
  );

drop policy if exists "members can update their own profile row" on public.event_share_members;
create policy "members can update their own profile row"
  on public.event_share_members for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

alter publication supabase_realtime add table public.event_share_members;

-- Deja ver los datos del evento + quiénes juegan a cualquier usuario autenticado que tenga el
-- share_id (el link funciona como capability token), SIN necesidad de ser miembro todavía —
-- si no, no se podría mostrar una previsualización antes de aceptar. security definer + un
-- search_path fijo para no depender de las policies de arriba.
create or replace function public.get_event_share_preview(p_share_id uuid)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'id', es.id,
    'sport_id', es.sport_id,
    'club', es.club,
    'court', es.court,
    'date', es.date,
    'time', es.time,
    'member_count', coalesce(array_length(es.member_user_ids, 1), 0),
    'confirmed_count', coalesce(array_length(es.confirmed_user_ids, 1), 0),
    'members', coalesce((
      select jsonb_agg(jsonb_build_object('user_id', m.user_id, 'name', m.name, 'phone', m.phone))
      from public.event_share_members m
      where m.share_id = es.id
    ), '[]'::jsonb)
  )
  from public.event_shares es
  where es.id = p_share_id;
$$;

grant execute on function public.get_event_share_preview(uuid) to authenticated;
