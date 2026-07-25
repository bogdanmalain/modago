-- View-ul rula cu SECURITY DEFINER (privilegiile creatorului, ocolind RLS
-- pentru oricine îl interoghează) în loc de SECURITY INVOKER (privilegiile
-- celui care interoghează). Tabela de bază (seller_reviews) e oricum
-- lizibilă public, deci schimbarea nu afectează funcționalitatea — doar
-- închide un vector de escaladare de privilegii teoretic.
alter view public.seller_rating_summary set (security_invoker = true);
