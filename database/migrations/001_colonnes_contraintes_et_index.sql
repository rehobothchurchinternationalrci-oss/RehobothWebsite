-- ============================================================
-- MIGRATION 001 — Colonnes de rattrapage, contraintes et index
-- ============================================================
-- Colonnes manquantes sur les bases anciennes, contraintes CHECK posées en
-- NOT VALID (jamais d'échec sur les lignes historiques), unicité du nom de
-- département et index de clés étrangères.
--
-- Rejouable : peut être exécutée plusieurs fois sans erreur ni doublon.
-- À exécuter dans l'éditeur SQL Supabase, dans l'ordre des numéros.
--
-- Annulation : voir 001_rollback.sql
-- ============================================================

ALTER TABLE users              ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users              ADD COLUMN IF NOT EXISTS email_verified       BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE eglise_parametres  ADD COLUMN IF NOT EXISTS logo_url             TEXT;
ALTER TABLE membres            ADD COLUMN IF NOT EXISTS photo_url            TEXT;
ALTER TABLE departements       ADD COLUMN IF NOT EXISTS is_active            BOOLEAN DEFAULT TRUE;
ALTER TABLE departements       ADD COLUMN IF NOT EXISTS icone                TEXT;
ALTER TABLE evenements         ADD COLUMN IF NOT EXISTS est_public           BOOLEAN DEFAULT TRUE;
ALTER TABLE chef_departement   ADD COLUMN IF NOT EXISTS created_at           TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW();
ALTER TABLE presences_reunion  ADD COLUMN IF NOT EXISTS created_at           TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW();

-- Aligner le pays par défaut sur la réalité (église à Chypre)
ALTER TABLE membres ALTER COLUMN pays SET DEFAULT 'Chypre';

-- Contraintes d'intégrité ajoutées après coup : NOT VALID pour ne jamais
-- échouer sur des lignes historiques incohérentes.
DO $do$
DECLARE spec record;
BEGIN
  FOR spec IN
    SELECT * FROM (VALUES
      ('evenements',   'chk_evenements_dates',  'date_fin IS NULL OR date_fin >= date_debut'),
      ('sessions',     'chk_sessions_dates',    'date_fin IS NULL OR date_fin >= date_debut'),
      ('sessions',     'chk_sessions_places',   'places_max IS NULL OR places_max > 0'),
      ('rendez_vous',  'chk_rdv_duree',         'duree_minutes IS NULL OR duree_minutes > 0'),
      ('membre_departements', 'chk_md_dates',   'date_sortie IS NULL OR date_sortie >= date_entree'),
      ('chef_departement',    'chk_chef_dates', 'date_fin IS NULL OR date_fin >= date_debut'),
      ('rapports_departement','chk_rapport_annee', 'annee BETWEEN 2000 AND 2200'),
      ('messages',     'chk_messages_no_self',  'expediteur_id <> destinataire_id')
    ) AS t(tbl, cons, expr)
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = spec.cons AND conrelid = format('public.%I', spec.tbl)::regclass
    ) THEN
      EXECUTE format('ALTER TABLE public.%I ADD CONSTRAINT %I CHECK (%s) NOT VALID',
                     spec.tbl, spec.cons, spec.expr);
    END IF;
  END LOOP;
END
$do$;

-- Unicité du nom de département : créée seulement si aucun doublon existant
-- (permet ensuite un seed avec ON CONFLICT plutôt qu'un test de table vide).
DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM departements GROUP BY lower(nom) HAVING count(*) > 1) THEN
    CREATE UNIQUE INDEX IF NOT EXISTS uq_departements_nom ON departements (lower(nom));
  ELSE
    RAISE NOTICE 'Doublons de nom dans departements : index unique non créé.';
  END IF;
END
$do$;

CREATE INDEX IF NOT EXISTS idx_users_email           ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role            ON users(role);
CREATE INDEX IF NOT EXISTS idx_membres_user_id       ON membres(user_id);
CREATE INDEX IF NOT EXISTS idx_membres_nom           ON membres(nom, prenom);
CREATE INDEX IF NOT EXISTS idx_membre_dept_membre    ON membre_departements(membre_id);
CREATE INDEX IF NOT EXISTS idx_membre_dept_dept      ON membre_departements(departement_id);
CREATE INDEX IF NOT EXISTS idx_chef_dept_user        ON chef_departement(user_id);
CREATE INDEX IF NOT EXISTS idx_chef_dept_dept        ON chef_departement(departement_id);
CREATE INDEX IF NOT EXISTS idx_departements_resp     ON departements(responsable_id);
CREATE INDEX IF NOT EXISTS idx_rdv_statut            ON rendez_vous(statut);
CREATE INDEX IF NOT EXISTS idx_rdv_date              ON rendez_vous(date_confirmee);
CREATE INDEX IF NOT EXISTS idx_annonces_publique     ON annonces(est_publique, is_active);
CREATE INDEX IF NOT EXISTS idx_medias_type           ON medias(type);
CREATE INDEX IF NOT EXISTS idx_finances_date         ON finances(date_transaction);
CREATE INDEX IF NOT EXISTS idx_messages_destinataire ON messages(destinataire_id, statut);
CREATE INDEX IF NOT EXISTS idx_notifications_user    ON notifications(user_id, est_lu);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user       ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_date       ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_evenements_date       ON evenements(date_debut);

-- ── Index de clés étrangères (Postgres n'indexe pas les FK automatiquement :
--    accélère les jointures et les suppressions en cascade) ──
CREATE INDEX IF NOT EXISTS idx_evenements_dept        ON evenements(departement_id);
CREATE INDEX IF NOT EXISTS idx_evenements_cree_par    ON evenements(cree_par);
CREATE INDEX IF NOT EXISTS idx_presences_membre       ON presences(membre_id);
CREATE INDEX IF NOT EXISTS idx_presences_evenement    ON presences(evenement_id);
CREATE INDEX IF NOT EXISTS idx_reunions_dept          ON reunions_departement(departement_id);
CREATE INDEX IF NOT EXISTS idx_presreunion_reunion    ON presences_reunion(reunion_id);
CREATE INDEX IF NOT EXISTS idx_presreunion_membre     ON presences_reunion(membre_id);
CREATE INDEX IF NOT EXISTS idx_rapports_dept          ON rapports_departement(departement_id);
CREATE INDEX IF NOT EXISTS idx_documents_dept         ON documents(departement_id);
CREATE INDEX IF NOT EXISTS idx_communications_dept    ON communications(departement_id);
CREATE INDEX IF NOT EXISTS idx_inscriptions_session   ON inscriptions_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_inscriptions_membre    ON inscriptions_sessions(membre_id);
CREATE INDEX IF NOT EXISTS idx_annonces_dept          ON annonces(departement_id);
CREATE INDEX IF NOT EXISTS idx_messages_expediteur    ON messages(expediteur_id);
CREATE INDEX IF NOT EXISTS idx_rdv_membre             ON rendez_vous(membre_id);
CREATE INDEX IF NOT EXISTS idx_finances_membre        ON finances(membre_id);
CREATE INDEX IF NOT EXISTS idx_prt_user               ON password_reset_tokens(user_id);

-- ── Index sur les colonnes réellement filtrées par l'application ──
CREATE INDEX IF NOT EXISTS idx_membres_statut         ON membres(statut);
CREATE INDEX IF NOT EXISTS idx_departements_actif     ON departements(actif);
CREATE INDEX IF NOT EXISTS idx_evenements_public      ON evenements(est_public, date_debut);
CREATE INDEX IF NOT EXISTS idx_predications_publie    ON predications(publie, date);
CREATE INDEX IF NOT EXISTS idx_dons_date              ON dons(date);
CREATE INDEX IF NOT EXISTS idx_communications_created ON communications(created_at);
