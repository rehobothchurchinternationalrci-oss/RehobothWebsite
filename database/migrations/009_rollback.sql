-- ============================================================
-- ROLLBACK 009 — Rétablissement des tables inutilisées
-- ============================================================
-- ⚠️ Ne restaure QUE la structure. Si ces tables contenaient des lignes au
-- moment de la migration 009, elles sont perdues : les réimporter depuis les
-- exports CSV réalisés à l'étape 1 de 009, s'ils ont été faits.
--
-- Aucun code applicatif ne lit ces tables : les rétablir ne fait revenir
-- aucune fonctionnalité, cela remet seulement le schéma dans son état
-- d'origine.
--
-- L'ordre compte : les types ENUM d'abord, puis `sessions` avant
-- `inscriptions_sessions` qui la référence.
--
-- Rejouable : peut être exécuté plusieurs fois sans erreur ni doublon.
-- ============================================================

-- ── Types ENUM ─────────────────────────────────────────────
-- CREATE TYPE n'accepte pas IF NOT EXISTS : on passe par un bloc conditionnel
-- pour que le script reste rejouable.
DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'media_type') THEN
    CREATE TYPE media_type AS ENUM ('PREDICATION','TEMOIGNAGE','CULTE','EVENEMENT','AUTRE');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_type') THEN
    CREATE TYPE notification_type AS ENUM ('EMAIL','INTERNE','SMS');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'rdv_status') THEN
    CREATE TYPE rdv_status AS ENUM ('EN_ATTENTE','APPROUVE','REFUSE','ANNULE','TERMINE');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'message_status') THEN
    CREATE TYPE message_status AS ENUM ('NON_LU','LU','ARCHIVE');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'session_type') THEN
    CREATE TYPE session_type AS ENUM ('BAPTEME','AFFERMISSEMENT','FORMATION','EVANGELISATION');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'inscription_status') THEN
    CREATE TYPE inscription_status AS ENUM ('INSCRIT','CONFIRME','ANNULE','PRESENT');
  END IF;
END
$do$;


-- ── Tables ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS annonces (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titre           VARCHAR(255) NOT NULL,
  contenu         TEXT NOT NULL,
  image_url       TEXT,
  est_publique    BOOLEAN DEFAULT TRUE,
  departement_id  UUID REFERENCES departements(id) ON DELETE SET NULL,
  date_publication TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  date_expiration  TIMESTAMP WITH TIME ZONE,
  publie_par      UUID REFERENCES users(id) ON DELETE SET NULL,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS galerie (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titre       VARCHAR(255),
  description TEXT,
  fichier_url TEXT NOT NULL,
  type_fichier VARCHAR(10) DEFAULT 'image',  -- 'image' | 'video'
  evenement   VARCHAR(255),
  date_prise  DATE,
  est_public  BOOLEAN DEFAULT TRUE,
  ajoutee_par UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS medias (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titre           VARCHAR(255) NOT NULL,
  description     TEXT,
  type            media_type NOT NULL DEFAULT 'PREDICATION',
  youtube_url     TEXT,
  fichier_url     TEXT,
  thumbnail_url   TEXT,
  intervenant     VARCHAR(200),
  date_enregistrement DATE,
  duree_secondes  INTEGER,
  est_public      BOOLEAN DEFAULT TRUE,
  publie_par      UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  type        notification_type NOT NULL DEFAULT 'INTERNE',
  titre       VARCHAR(255) NOT NULL,
  contenu     TEXT NOT NULL,
  lien        TEXT,
  est_lu      BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rendez_vous (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  membre_id       UUID REFERENCES membres(id) ON DELETE SET NULL,
  nom_demandeur   VARCHAR(200),
  email_demandeur VARCHAR(255),
  telephone_demandeur VARCHAR(30),
  motif           TEXT NOT NULL,
  date_souhaitee  TIMESTAMP WITH TIME ZONE,
  date_confirmee  TIMESTAMP WITH TIME ZONE,
  duree_minutes   INTEGER DEFAULT 30,
  lieu            VARCHAR(255),
  statut          rdv_status NOT NULL DEFAULT 'EN_ATTENTE',
  note_pasteur    TEXT,
  cree_par        UUID REFERENCES users(id) ON DELETE SET NULL,
  approuve_par    UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expediteur_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  destinataire_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sujet           VARCHAR(255),
  contenu         TEXT NOT NULL,
  statut          message_status NOT NULL DEFAULT 'NON_LU',
  parent_id       UUID REFERENCES messages(id) ON DELETE SET NULL,
  created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type            session_type NOT NULL,
  titre           VARCHAR(255) NOT NULL,
  description     TEXT,
  date_debut      TIMESTAMP WITH TIME ZONE NOT NULL,
  date_fin        TIMESTAMP WITH TIME ZONE,
  lieu            VARCHAR(255),
  places_max      INTEGER,
  responsable_id  UUID REFERENCES users(id) ON DELETE SET NULL,
  est_ouvert      BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inscriptions_sessions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  membre_id   UUID REFERENCES membres(id) ON DELETE SET NULL,
  nom_prenom  VARCHAR(200),
  email       VARCHAR(255),
  telephone   VARCHAR(30),
  statut      inscription_status NOT NULL DEFAULT 'INSCRIT',
  note        TEXT,
  created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token       VARCHAR(255) UNIQUE NOT NULL,
  expires_at  TIMESTAMP WITH TIME ZONE NOT NULL,
  used        BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);


-- ── Vues ───────────────────────────────────────────────────
-- Rétablies dans leur définition d'origine, avec les compteurs qui reposaient
-- sur `rendez_vous` et `sessions`. À exécuter APRÈS les CREATE TABLE ci-dessus,
-- sinon les vues référenceraient des tables absentes.
CREATE OR REPLACE VIEW v_rdv_en_attente WITH (security_invoker = on) AS
SELECT
  r.id,
  r.motif,
  r.date_souhaitee,
  r.statut,
  r.created_at,
  COALESCE(m.nom || ' ' || m.prenom, r.nom_demandeur) AS nom_demandeur,
  COALESCE(m.email, r.email_demandeur)                AS email_demandeur
FROM rendez_vous r
LEFT JOIN membres m ON r.membre_id = m.id
WHERE r.statut = 'EN_ATTENTE';

-- CREATE OR REPLACE ne peut pas ajouter de colonnes au milieu d'une vue
-- existante : la version amputée laissée par 009 doit d'abord disparaître.
DROP VIEW IF EXISTS v_statistiques_globales;
CREATE VIEW v_statistiques_globales WITH (security_invoker = on) AS
SELECT
  (SELECT COUNT(*) FROM membres)                              AS total_membres,
  (SELECT COUNT(*) FROM membres WHERE est_baptise = TRUE)     AS membres_baptises,
  (SELECT COUNT(*) FROM departements WHERE is_active = TRUE)  AS total_departements,
  (SELECT COUNT(*) FROM rendez_vous WHERE statut = 'EN_ATTENTE') AS rdv_en_attente,
  (SELECT COUNT(*) FROM sessions WHERE est_ouvert = TRUE)     AS sessions_ouvertes,
  (SELECT COALESCE(SUM(montant), 0) FROM finances
   WHERE EXTRACT(MONTH FROM date_transaction) = EXTRACT(MONTH FROM NOW())
   AND   EXTRACT(YEAR  FROM date_transaction) = EXTRACT(YEAR  FROM NOW()))
                                                              AS finances_ce_mois;


-- ── RLS ────────────────────────────────────────────────────
-- La migration 004 active RLS par balayage de toutes les tables du schéma
-- public : la rejouer après ce rollback remettra ces tables sous protection,
-- sinon elles restent accessibles à tout compte authentifié.
ALTER TABLE annonces              ENABLE ROW LEVEL SECURITY;
ALTER TABLE galerie               ENABLE ROW LEVEL SECURITY;
ALTER TABLE medias                ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications         ENABLE ROW LEVEL SECURITY;
ALTER TABLE rendez_vous           ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages              ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions              ENABLE ROW LEVEL SECURITY;
ALTER TABLE inscriptions_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;
