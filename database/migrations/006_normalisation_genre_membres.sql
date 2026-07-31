-- ============================================================
-- MIGRATION 006 — Normalisation de membres.genre
-- ============================================================
-- Ramène les saisies libres à 'M' / 'F' (le reste passe à NULL) puis pose la
-- contrainte chk_membres_genre. Sert à l'appellation « Frère » / « Sœur ».
--
-- Rejouable : peut être exécutée plusieurs fois sans erreur ni doublon.
-- À exécuter dans l'éditeur SQL Supabase, dans l'ordre des numéros.
--
-- Annulation : voir 006_rollback.sql
-- ============================================================

-- ── Genre : valeurs normalisées 'M' / 'F' ───────────────────
-- Sert à l'appellation fraternelle dans l'application (« Frère », « Sœur »).
-- Les saisies libres antérieures sont ramenées aux deux valeurs canoniques ;
-- tout ce qui reste ambigu repasse à NULL (non renseigné).
UPDATE membres
   SET genre = CASE
         WHEN lower(btrim(genre)) IN ('m','masculin','homme','h','male','frere','frère') THEN 'M'
         WHEN lower(btrim(genre)) IN ('f','feminin','féminin','femme','female','soeur','sœur') THEN 'F'
         ELSE NULL
       END
 WHERE genre IS NOT NULL
   AND genre NOT IN ('M', 'F');

DO $do$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'chk_membres_genre'
       AND conrelid = 'public.membres'::regclass
  ) THEN
    ALTER TABLE membres
      ADD CONSTRAINT chk_membres_genre CHECK (genre IS NULL OR genre IN ('M', 'F'));
  END IF;
END
$do$;
