-- Bucket-ul 'items' e marcat public la nivel de bucket, deci accesul la
-- poze prin getPublicUrl() funcționează fără nicio politică RLS pe
-- storage.objects. Politica de SELECT ("Public can view images") nu mai
-- adaugă nimic pentru asta — permite doar listarea (.list()) tuturor
-- fișierelor din bucket către oricine, funcționalitate nefolosită nicăieri
-- în aplicație (am verificat: nicio chemare .list() pe bucket-ul items).
drop policy if exists "Public can view images" on storage.objects;
