-- ============================================================
-- ANNULATION DE LA MIGRATION 001 — Colonnes de rattrapage, contraintes et index
-- ============================================================
-- Les index de performance sont conservés : les retirer ne ferait que dégrader
-- les temps de réponse. Seules les contraintes ajoutées sont levées.
-- ============================================================

ALTER TABLE evenements           DROP CONSTRAINT IF EXISTS chk_evenements_dates;
ALTER TABLE sessions             DROP CONSTRAINT IF EXISTS chk_sessions_dates;
ALTER TABLE sessions             DROP CONSTRAINT IF EXISTS chk_sessions_places;
ALTER TABLE rendez_vous          DROP CONSTRAINT IF EXISTS chk_rdv_duree;
ALTER TABLE membre_departements  DROP CONSTRAINT IF EXISTS chk_md_dates;
ALTER TABLE chef_departement     DROP CONSTRAINT IF EXISTS chk_chef_dates;
ALTER TABLE rapports_departement DROP CONSTRAINT IF EXISTS chk_rapport_annee;
ALTER TABLE messages             DROP CONSTRAINT IF EXISTS chk_messages_no_self;

DROP INDEX IF EXISTS uq_departements_nom;
