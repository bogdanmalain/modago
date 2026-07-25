-- create_profile_on_signup e o funcție-trigger (pe auth.users, after insert)
-- — nu trebuie apelată direct de nimeni prin API. Momentan orice user
-- (chiar neautentificat) putea invoca /rest/v1/rpc/create_profile_on_signup.
-- Revocarea EXECUTE nu afectează trigger-ul: acesta se declanșează automat
-- la INSERT în auth.users, indiferent de privilegiile de EXECUTE ale
-- rolului care a cauzat inserarea.
revoke execute on function public.create_profile_on_signup() from public, anon, authenticated;
