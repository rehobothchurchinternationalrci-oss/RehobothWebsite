-- ============================================================
-- ANNULATION DE LA MIGRATION 003 — Un seul chef actif par département
-- ============================================================
-- ATTENTION : les chefs basculés en historique ne sont PAS restaurés — il est
-- impossible de deviner lequel des chefs simultanés était le bon.
-- ============================================================

DROP INDEX IF EXISTS uq_chef_departement_actif;
ALTER TABLE chef_departement ALTER COLUMN is_actif DROP NOT NULL;
