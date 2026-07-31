-- ============================================================
-- ANNULATION DE LA MIGRATION 006 — Normalisation de membres.genre
-- ============================================================
-- ATTENTION : les saisies libres d'origine (« Homme », « masculin »...) ne sont
-- pas restaurées, seule la contrainte est levée.
-- ============================================================

ALTER TABLE membres DROP CONSTRAINT IF EXISTS chk_membres_genre;
