-- Correr en el SQL Editor del proyecto correcto (prefijo bpgv...).
-- La cantidad de jugadores necesaria dejó de venir fija del deporte — ahora es un campo
-- propio del evento, así que el share también necesita cargarlo para que quien recibe el
-- link vea "Juegan (X/N)" con el número real, no un valor por defecto inventado.

alter table public.event_shares
  add column if not exists required_players integer;

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
    'required_players', es.required_players,
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
