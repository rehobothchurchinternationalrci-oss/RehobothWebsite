-- ============================================================
-- MIGRATION 009 — Nettoyage des tables jamais utilisées
-- ============================================================
-- Le schéma d'origine prévoyait des modules qui n'ont jamais été construits.
-- Sur les 27 tables du DDL, l'API n'en interroge que 14. Cette migration
-- supprime celles qu'aucune ligne de code ne lit ni n'écrit.
--
-- Méthode de recensement : toutes les tables atteintes par le backend passent
-- par `BaseService("<table>")` ou `supabase.table("<table>")`. Les tables
-- listées ici n'apparaissent dans aucun des deux. Le module SQLAlchemy
-- (`models/models.py`) les déclare encore, mais il est mort au runtime :
-- `db.init_app()` n'est jamais appelé, l'application parle à Supabase via
-- PostgREST.
--
-- ⚠️ DESTRUCTIF ET IRRÉVERSIBLE
-- Ces tables sont vides dans une installation normale, mais VÉRIFIEZ-LE avant
-- d'exécuter quoi que ce soit — voir l'inventaire ci-dessous.
--
-- Rejouable : peut être exécutée plusieurs fois sans erreur.
-- À exécuter dans l'éditeur SQL Supabase, APRÈS les migrations 001 à 008.
--
-- Annulation : voir 009_rollback.sql (ne restaure pas les données).
-- ============================================================


-- ── ÉTAPE 1 — Inventaire (à lancer SEUL, avant tout le reste) ───────────────
-- Compte les lignes de chaque table visée. Tout ce qui n'est pas à 0 mérite
-- un export CSV avant suppression.
--
-- SELECT 'annonces' AS table_name, count(*) FROM annonces
-- UNION ALL SELECT 'galerie',               count(*) FROM galerie
-- UNION ALL SELECT 'inscriptions_sessions', count(*) FROM inscriptions_sessions
-- UNION ALL SELECT 'medias',                count(*) FROM medias
-- UNION ALL SELECT 'messages',              count(*) FROM messages
-- UNION ALL SELECT 'notifications',         count(*) FROM notifications
-- UNION ALL SELECT 'password_reset_tokens', count(*) FROM password_reset_tokens
-- UNION ALL SELECT 'rendez_vous',           count(*) FROM rendez_vous
-- UNION ALL SELECT 'sessions',              count(*) FROM sessions
-- UNION ALL SELECT 'audit_logs',            count(*) FROM audit_logs
-- UNION ALL SELECT 'finances',              count(*) FROM finances
-- UNION ALL SELECT 'parametres_systeme',    count(*) FROM parametres_systeme
-- ORDER BY 1;


-- ── ÉTAPE 1b — Vues dépendantes ────────────────────────────────────────────
-- Deux vues s'appuient sur des tables supprimées plus bas. Postgres refuse un
-- DROP TABLE tant qu'une vue en dépend, il faut donc les retirer d'abord.
-- Aucune n'est interrogée par le backend ni par le frontend (vérifié) : ce
-- sont des vues de confort restées inexploitées.
--
--   v_rdv_en_attente        → repose entièrement sur `rendez_vous`, elle perd
--                             son objet et n'est pas recréée.
--   v_statistiques_globales → agrège 6 compteurs, dont 2 sur `rendez_vous` et
--                             `sessions`. Elle est recréée à l'étape 2c, sans
--                             ces deux-là.
--
-- Les deux autres vues du schéma (`v_membres_complets`, `v_chef_departements`)
-- ne portent que sur des tables conservées : elles ne sont pas touchées.
DROP VIEW IF EXISTS v_rdv_en_attente;
DROP VIEW IF EXISTS v_statistiques_globales;


-- ── ÉTAPE 2 — Suppression des tables mortes ────────────────────────────────
-- DROP TABLE emporte les index, triggers et politiques RLS de chaque table.
-- Pas de CASCADE, volontairement : si une dépendance imprévue existe, la
-- commande doit échouer bruyamment plutôt que détruire en chaîne.

-- Modules jamais développés : aucun endpoint, aucun écran.
DROP TABLE IF EXISTS annonces;
DROP TABLE IF EXISTS galerie;
DROP TABLE IF EXISTS medias;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS rendez_vous;         -- emporte le trigger trg_rdv_updated_at

-- Messagerie interne jamais branchée (messages.parent_id est auto-référent,
-- rien d'autre ne pointe vers cette table).
DROP TABLE IF EXISTS messages;

-- Sessions de formation : l'ordre compte, inscriptions_sessions.session_id
-- référence sessions(id).
DROP TABLE IF EXISTS inscriptions_sessions;
DROP TABLE IF EXISTS sessions;

-- Réinitialisation de mot de passe : gérée de bout en bout par Supabase Auth
-- (`auth.users`), cette table applicative n'a jamais reçu de ligne.
DROP TABLE IF EXISTS password_reset_tokens;


-- ── ÉTAPE 2b — Types ENUM devenus orphelins ────────────────────────────────
-- DROP TABLE ne supprime pas les types : ces six-là ne servaient qu'aux tables
-- ci-dessus (une table chacun, vérifié) et n'ont plus de porteur. Sans le
-- IF EXISTS, rejouer la migration échouerait.
DROP TYPE IF EXISTS media_type;
DROP TYPE IF EXISTS notification_type;
DROP TYPE IF EXISTS rdv_status;
DROP TYPE IF EXISTS message_status;
DROP TYPE IF EXISTS session_type;
DROP TYPE IF EXISTS inscription_status;


-- ── ÉTAPE 2c — Recréation de v_statistiques_globales ───────────────────────
-- Version amputée de ses deux compteurs morts (`rdv_en_attente` et
-- `sessions_ouvertes`). Les quatre autres sources sont intactes.
--
-- Si vous décommentez la suppression de `finances` à l'étape 3, recréez cette
-- vue sans son dernier compteur, sinon elle deviendra invalide.
CREATE OR REPLACE VIEW v_statistiques_globales WITH (security_invoker = on) AS
SELECT
  (SELECT COUNT(*) FROM membres)                              AS total_membres,
  (SELECT COUNT(*) FROM membres WHERE est_baptise = TRUE)     AS membres_baptises,
  (SELECT COUNT(*) FROM departements WHERE is_active = TRUE)  AS total_departements,
  (SELECT COALESCE(SUM(montant), 0) FROM finances
   WHERE EXTRACT(MONTH FROM date_transaction) = EXTRACT(MONTH FROM NOW())
   AND   EXTRACT(YEAR  FROM date_transaction) = EXTRACT(YEAR  FROM NOW()))
                                                              AS finances_ce_mois;


-- ── ÉTAPE 3 — À DÉCIDER : laissé commenté volontairement ───────────────────
-- Ces trois tables ne sont pas lues par l'application non plus, mais les
-- supprimer engage plus qu'un simple nettoyage technique. Décommentez au cas
-- par cas, en connaissance de cause.

-- `finances` — livre comptable. Aucun code ne l'utilise, mais c'est la seule
-- table pouvant contenir de vraies écritures financières saisies à la main
-- depuis l'interface Supabase. Exportez-la avant, sans exception.
-- Son type `transaction_type` ne sert qu'à elle et devient orphelin ensuite.
-- `v_statistiques_globales` la compte : recréez la vue sans son dernier
-- compteur, sinon le DROP TABLE échouera sur la dépendance.
--
-- CREATE OR REPLACE VIEW v_statistiques_globales WITH (security_invoker = on) AS
-- SELECT
--   (SELECT COUNT(*) FROM membres)                             AS total_membres,
--   (SELECT COUNT(*) FROM membres WHERE est_baptise = TRUE)    AS membres_baptises,
--   (SELECT COUNT(*) FROM departements WHERE is_active = TRUE) AS total_departements;
--
-- DROP TABLE IF EXISTS finances;
-- DROP TYPE  IF EXISTS transaction_type;

-- `audit_logs` — journal d'audit. Vide tant que rien ne l'alimente, mais
-- c'est une trace : à conserver si vous comptez brancher la traçabilité
-- un jour, ou si une obligation de conservation s'applique.
--
-- DROP TABLE IF EXISTS audit_logs;

-- `parametres_systeme` — ancien magasin clé/valeur (church_name,
-- culte_horaires, maintenance_mode…), remplacé par `eglise_parametres` que
-- lit l'écran /dashboard/parametres. La migration 005 l'alimente encore :
-- la supprimer impose de retirer aussi son bloc INSERT dans 005, sinon une
-- base neuve rejouant la chaîne échouera.
--
-- DROP TABLE IF EXISTS parametres_systeme;


-- ── CONSERVÉE : `roles` ────────────────────────────────────────────────────
-- `roles` n'est interrogée par aucun code applicatif, mais elle est porteuse :
--     users.role VARCHAR(50) NOT NULL DEFAULT 'MEMBRE' REFERENCES roles(id)
-- La supprimer casserait cette clé étrangère et donc la table `users`.
-- Elle reste en place.
