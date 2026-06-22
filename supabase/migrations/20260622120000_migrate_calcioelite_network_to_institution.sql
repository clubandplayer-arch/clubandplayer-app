-- Migra l'utenza CALCIOELITE NETWORK dal ruolo Club al ruolo ENTE.
-- Auth UID: a91ed4b2-c902-4700-8fc6-c71387e7ab09

UPDATE public.profiles
SET
  account_type = 'institution',
  type = 'institution',
  role = 'Ente',
  updated_at = now()
WHERE user_id = 'a91ed4b2-c902-4700-8fc6-c71387e7ab09'
  AND (
    account_type IS DISTINCT FROM 'institution'
    OR type IS DISTINCT FROM 'institution'
    OR role IS DISTINCT FROM 'Ente'
  );
