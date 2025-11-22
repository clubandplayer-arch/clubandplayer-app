-- Script SQL da eseguire manualmente nella console Supabase
-- Scopo: aggiungere le colonne mancanti usate dalle pagine Notifiche e Seguiti

-- 1) Tabella notifications: aggiunta colonna kind per classificare le notifiche
ALTER TABLE public.notifications
ADD COLUMN IF NOT EXISTS kind text;

-- Default consigliato per nuove righe
ALTER TABLE public.notifications
ALTER COLUMN kind SET DEFAULT 'system';

-- Indice utile per i filtri per tipo di notifica
CREATE INDEX IF NOT EXISTS notifications_kind_idx
ON public.notifications (kind);

-- 2) Tabella follows: colonna target_id per riferirsi al profilo seguito (club o player)
ALTER TABLE public.follows
ADD COLUMN IF NOT EXISTS target_id uuid;

-- Se esiste già una colonna club_id o simile, popolala come fallback:
-- UPDATE public.follows
-- SET target_id = club_id
-- WHERE target_id IS NULL AND club_id IS NOT NULL;

-- Indice per ricerche sul target seguito
CREATE INDEX IF NOT EXISTS follows_target_id_idx
ON public.follows (target_id);

-- Se il modello prevede anche target_type, assicurati che esista:
ALTER TABLE public.follows
ADD COLUMN IF NOT EXISTS target_type text;
