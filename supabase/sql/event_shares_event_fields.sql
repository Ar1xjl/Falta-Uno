-- Correr en el SQL Editor. Suma los datos reales del evento a event_shares, para que quien
-- entra por un link de invitación pueda armar su propio Event local a partir del share
-- (hasta ahora solo viajaba un UUID pelado, sin deporte/club/cancha/fecha/hora).
-- No toca join_event_share ni ninguna policy existente.

alter table public.event_shares
  add column if not exists sport_id text,
  add column if not exists club text,
  add column if not exists court text,
  add column if not exists date text,
  add column if not exists time text;
