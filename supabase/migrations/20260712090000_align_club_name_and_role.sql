-- Allinea club_name alle anagrafiche club e valorizza il ruolo dei profili club

-- Backfill club_name dalle anagrafiche club (priorità: club_id, altrimenti owner/created_by)
WITH candidates AS (
  SELECT
    o.id,
    COALESCE(pc.full_name, po.full_name) AS full_name
  FROM public.opportunities o
  LEFT JOIN public.profiles pc ON pc.id = o.club_id
  LEFT JOIN public.profiles po ON po.user_id = COALESCE(o.owner_id, o.created_by)
)
UPDATE public.opportunities o
SET club_name = c.full_name
FROM candidates c
WHERE o.id = c.id
  AND c.full_name IS NOT NULL
  AND o.club_name IS DISTINCT FROM c.full_name;

-- Backfill ruoli per i profili club
UPDATE public.profiles p
SET role = 'Club'
WHERE (p.account_type = 'club' OR lower(coalesce(p.type, '')) = 'club')
  AND (p.role IS NULL OR p.role <> 'Club');
