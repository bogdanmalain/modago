-- Fixăm search_path pe funcțiile fără el setat — fără asta, un rol cu
-- privilegii de a crea obiecte într-o schemă din search_path ar putea
-- teoretic "deturna" apeluri de funcții/tabele nume-neschema-calificate
-- din interiorul acestor funcții. Setăm explicit 'public' (schema în care
-- rulează oricum toate), ceea ce elimină ambiguitatea.
alter function public.update_conversation_timestamp() set search_path = 'public';
alter function public.create_profile_on_signup() set search_path = 'public';
alter function public.set_scheduled_delete() set search_path = 'public';
alter function public.cleanup_expired_conversations() set search_path = 'public';
alter function public.handle_updated_at() set search_path = 'public';
alter function public.orders_status_timestamps() set search_path = 'public';
alter function public.sync_item_status() set search_path = 'public';
alter function public.ensure_single_default_address() set search_path = 'public';
alter function public.sync_open_ticket_flag() set search_path = 'public';
