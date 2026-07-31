-- ============================================================
-- MIGRATION 003 — Un seul chef actif par département
-- ============================================================
-- is_actif passe NOT NULL, les départements ayant plusieurs chefs actifs sont
-- réparés (le plus récent reste en poste, les autres passent à l'historique),
-- puis un index unique partiel garantit la règle.
--
-- Rejouable : peut être exécutée plusieurs fois sans erreur ni doublon.
-- À exécuter dans l'éditeur SQL Supabase, dans l'ordre des numéros.
--
-- Annulation : voir 003_rollback.sql
-- ============================================================

-- ── Un seul chef actif par département ──────────────────────
-- 1. is_actif ne doit pas être NULL (un NULL échapperait à l'index partiel
--    tout en étant traité comme « actif » par le code et par app_is_chef()).
UPDATE chef_departement SET is_actif = TRUE WHERE is_actif IS NULL;
ALTER TABLE chef_departement ALTER COLUMN is_actif SET DEFAULT TRUE;
DO $do$
BEGIN
  ALTER TABLE chef_departement ALTER COLUMN is_actif SET NOT NULL;
EXCEPTION WHEN others THEN
  RAISE NOTICE 'chef_departement.is_actif : NOT NULL non appliqué (%).', SQLERRM;
END
$do$;

-- 2. Réparer les départements ayant plusieurs chefs actifs : on ne garde en
--    poste que le plus récent, les autres passent à l'historique (is_actif
--    = FALSE, date_fin renseignée). Aucune ligne n'est supprimée.
WITH classement AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY departement_id
           ORDER BY date_debut DESC NULLS LAST, created_at DESC, id DESC
         ) AS rang
    FROM chef_departement
   WHERE is_actif
)
UPDATE chef_departement cd
   SET is_actif = FALSE,
       date_fin = COALESCE(cd.date_fin, CURRENT_DATE)
  FROM classement c
 WHERE cd.id = c.id AND c.rang > 1;

-- 3. La contrainte elle-même
CREATE UNIQUE INDEX IF NOT EXISTS uq_chef_departement_actif
  ON chef_departement (departement_id) WHERE is_actif;
