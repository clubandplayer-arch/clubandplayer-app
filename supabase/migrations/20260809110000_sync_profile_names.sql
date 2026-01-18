-- Sincronizza full_name e display_name nei profili

CREATE OR REPLACE FUNCTION public.sync_profile_names()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.full_name IS NOT NULL AND btrim(NEW.full_name) = '' THEN
    NEW.full_name := NULL;
  END IF;
  IF NEW.display_name IS NOT NULL AND btrim(NEW.display_name) = '' THEN
    NEW.display_name := NULL;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.full_name IS NULL AND NEW.display_name IS NOT NULL THEN
      NEW.full_name := NEW.display_name;
    ELSIF NEW.display_name IS NULL AND NEW.full_name IS NOT NULL THEN
      NEW.display_name := NEW.full_name;
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.full_name IS DISTINCT FROM OLD.full_name
     AND NEW.display_name IS NOT DISTINCT FROM OLD.display_name THEN
    NEW.display_name := NEW.full_name;
  ELSIF NEW.display_name IS DISTINCT FROM OLD.display_name
        AND NEW.full_name IS NOT DISTINCT FROM OLD.full_name THEN
    NEW.full_name := NEW.display_name;
  END IF;

  IF NEW.full_name IS NULL AND NEW.display_name IS NOT NULL THEN
    NEW.full_name := NEW.display_name;
  ELSIF NEW.display_name IS NULL AND NEW.full_name IS NOT NULL THEN
    NEW.display_name := NEW.full_name;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_sync_names ON public.profiles;
CREATE TRIGGER profiles_sync_names
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.sync_profile_names();
