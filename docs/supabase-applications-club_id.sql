-- Aggiunge la colonna club_id alla tabella applications e la collega alle opportunità
-- Eseguire questi comandi manualmente nella dashboard SQL di Supabase (non vengono eseguiti da qui)

-- 1) Colonna club_id (nullable per compatibilità retro)
ALTER TABLE public.applications
ADD COLUMN IF NOT EXISTS club_id uuid;

-- 2) Opzionale: valorizza club_id a partire dalle opportunità esistenti
UPDATE public.applications a
SET club_id = o.owner_id
FROM public.opportunities o
WHERE a.opportunity_id = o.id
  AND a.club_id IS NULL;

-- 3) Facoltativo: vincolo FK se la tabella clubs/owners è definita
-- ALTER TABLE public.applications
--   ADD CONSTRAINT applications_club_id_fkey
--   FOREIGN KEY (club_id) REFERENCES public.clubs(id) ON DELETE SET NULL;

-- 4) Indice per filtrare per club
CREATE INDEX IF NOT EXISTS applications_club_id_idx ON public.applications (club_id);

-- Ricorda di aggiornare le policy RLS affinché:
-- - un club possa leggere solo le candidature legate alle proprie opportunità (club_id = auth.uid())
-- - un player possa leggere solo le proprie candidature (athlete_id = auth.uid())
