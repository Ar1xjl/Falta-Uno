-- Correr en el SQL Editor del dashboard para dejar la base limpia de todo lo generado
-- probando el login por clave de dispositivo (Juan, la sesión de Claude, y la persona invitada).
-- Borra en orden por las foreign keys; no toca nada del resto de la app.

delete from public.event_share_settlements;
delete from public.event_share_expenses;
delete from public.event_shares;
delete from public.user_pubkeys;
delete from public.auth_nonces;
delete from auth.users where email like 'p-%@device.falta-uno.local';
