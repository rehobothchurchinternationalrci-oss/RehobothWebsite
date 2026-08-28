-- ============================================================
-- REHOBOTH CHURCH INTERNATIONAL — DDL PostgreSQL Complet
-- Combined & Unified Version — idempotent + RLS sur toutes les tables
-- ============================================================
--
-- Ce script est REJOUABLE : il peut être exécuté autant de fois que
-- nécessaire sur une base vide comme sur une base existante, sans erreur
-- et sans perte de données.
--
-- Modèle de sécurité :
--   • Le backend Flask utilise la clé SUPABASE_SERVICE_ROLE_KEY. Le rôle
--     `service_role` possède l'attribut BYPASSRLS : l'API n'est donc JAMAIS
--     bloquée par les politiques ci-dessous, l'autorisation métier reste
--     assurée par middlewares/rbac.py.
--   • Le RLS est la seconde barrière : il protège la base si quelqu'un
--     attaque PostgREST directement avec la clé `anon` ou un JWT utilisateur.
--   • Règle de base : tout est interdit par défaut (RLS activé, aucune
--     politique = aucun accès), puis on ouvre explicitement.
--
-- ⚠ ALTER TYPE ... ADD VALUE (section 1c) ne peut pas être exécuté dans la
--   même transaction que l'utilisation de la nouvelle valeur. En pratique
--   c'est un no-op sur une base à jour. Si l'éditeur SQL renvoie l'erreur
--   55P04, exécuter la section 1c seule d'abord.
-- ============================================================


-- ============================================================
-- 0. PRÉ-REQUIS (extensions, schéma auth, rôles Supabase)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Sur une instance PostgreSQL nue (docker local, CI), le schéma `auth` et
-- auth.uid() de Supabase n'existent pas : on fournit un équivalent minimal
-- lisant la claim `sub` du JWT. Sur Supabase, ces blocs ne font rien.

-- Rôles PostgREST : présents sur Supabase, créés sinon. À faire AVANT les
-- GRANT du bloc suivant.
DO $do$
DECLARE r text;
BEGIN
  FOREACH r IN ARRAY ARRAY['anon', 'authenticated', 'service_role'] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
      EXECUTE format('CREATE ROLE %I NOLOGIN NOINHERIT', r);
    END IF;
  END LOOP;
EXCEPTION WHEN insufficient_privilege THEN
  RAISE NOTICE 'Création des rôles impossible : ignoré.';
END
$do$;

DO $do$
BEGIN
  IF to_regnamespace('auth') IS NULL THEN
    EXECUTE 'CREATE SCHEMA auth';
  END IF;

  IF to_regprocedure('auth.uid()') IS NULL THEN
    EXECUTE $fn$
      CREATE FUNCTION auth.uid() RETURNS uuid
      LANGUAGE sql STABLE
      AS 'SELECT NULLIF(current_setting(''request.jwt.claim.sub'', true), '''')::uuid'
    $fn$;
    EXECUTE 'GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role';
    EXECUTE 'GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated, service_role';
  END IF;
EXCEPTION WHEN insufficient_privilege THEN
  RAISE NOTICE 'Schéma auth non modifiable (instance Supabase gérée) : ignoré.';
END
$do$;


-- ============================================================
-- 1. TYPES ET RÉFÉRENTIELS
-- ============================================================

-- 1a. Table des rôles applicatifs
CREATE TABLE IF NOT EXISTS roles (
  id   VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL
);

INSERT INTO roles (id, name) VALUES
  ('SUPER_ADMIN', 'SUPER_ADMIN'),
  ('PASTEUR', 'PASTEUR'),
  ('SECRETAIRE', 'SECRETAIRE'),
  ('EQUIPE_MEDIA', 'EQUIPE_MEDIA'),
  ('CHEF_DEPARTEMENT', 'CHEF_DEPARTEMENT'),
  ('MEMBRE', 'MEMBRE')
ON CONFLICT (id) DO NOTHING;

-- 1b. Types ENUM (créés seulement s'ils n'existent pas)
DO $$ BEGIN
  CREATE TYPE rdv_status AS ENUM ('EN_ATTENTE','APPROUVE','REFUSE','ANNULE','TERMINE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE transaction_type AS ENUM ('DIME','OFFRANDE','DON','AUTRE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE session_type AS ENUM ('BAPTEME','AFFERMISSEMENT','FORMATION','EVANGELISATION');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE inscription_status AS ENUM ('INSCRIT','CONFIRME','ANNULE','PRESENT');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE message_status AS ENUM ('NON_LU','LU','ARCHIVE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE notification_type AS ENUM ('EMAIL','INTERNE','SMS');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE media_type AS ENUM ('PREDICATION','TEMOIGNAGE','CULTE','EVENEMENT','AUTRE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE presence_status AS ENUM ('PRESENT','ABSENT','EXCUSE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 1c. Rattrapage : valeurs manquantes sur un type déjà existant (no-op si à jour)
DO $do$
DECLARE
  spec  record;
  val   text;
BEGIN
  FOR spec IN
    SELECT * FROM (VALUES
      ('rdv_status',         ARRAY['EN_ATTENTE','APPROUVE','REFUSE','ANNULE','TERMINE']),
      ('transaction_type',   ARRAY['DIME','OFFRANDE','DON','AUTRE']),
      ('session_type',       ARRAY['BAPTEME','AFFERMISSEMENT','FORMATION','EVANGELISATION']),
      ('inscription_status', ARRAY['INSCRIT','CONFIRME','ANNULE','PRESENT']),
      ('message_status',     ARRAY['NON_LU','LU','ARCHIVE']),
      ('notification_type',  ARRAY['EMAIL','INTERNE','SMS']),
      ('media_type',         ARRAY['PREDICATION','TEMOIGNAGE','CULTE','EVENEMENT','AUTRE']),
      ('presence_status',    ARRAY['PRESENT','ABSENT','EXCUSE'])
    ) AS t(type_name, valeurs)
  LOOP
    FOREACH val IN ARRAY spec.valeurs LOOP
      EXECUTE format('ALTER TYPE public.%I ADD VALUE IF NOT EXISTS %L', spec.type_name, val);
    END LOOP;
  END LOOP;
END
$do$;


-- ============================================================
-- 2. TABLES
-- ============================================================

-- ── users ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role          VARCHAR(50) NOT NULL DEFAULT 'MEMBRE' REFERENCES roles(id),
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  must_change_password BOOLEAN NOT NULL DEFAULT FALSE,
  last_login    TIMESTAMP WITH TIME ZONE,
  created_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ── eglise_parametres (fiche église) ────────────────────────
CREATE TABLE IF NOT EXISTS eglise_parametres (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    nom TEXT NOT NULL,
    adresse TEXT,
    ville TEXT,
    telephone TEXT,
    email_contact TEXT,
    site_web TEXT,
    facebook TEXT,
    youtube TEXT,
    instagram TEXT,
    horaires TEXT,
    description TEXT,
    vision TEXT,
    histoire TEXT,
    logo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ── membres ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS membres (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           uuid UNIQUE REFERENCES users(id) ON DELETE SET NULL,
    prenom            TEXT NOT NULL,
    nom               TEXT NOT NULL,
    email             TEXT UNIQUE,
    telephone         TEXT,
    adresse           TEXT,
    quartier          TEXT,
    ville             TEXT,
    pays              TEXT DEFAULT 'Chypre',
    genre             TEXT,
    date_naissance    DATE,
    statut            TEXT NOT NULL DEFAULT 'membre_actif' CHECK (statut IN ('membre_actif', 'membre_inactif', 'visiteur')),
    date_adhesion     DATE,
    est_baptise       BOOLEAN DEFAULT FALSE,
    date_bapteme      DATE,
    photo_url         TEXT,
    notes             TEXT,
    created_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ── departements ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS departements (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    nom             TEXT NOT NULL,
    description     TEXT,
    type            TEXT CHECK (type IN ('cellule', 'equipe_service', 'chorale', 'jeunesse', 'autre')),
    responsable_id  UUID REFERENCES users(id) ON DELETE SET NULL,
    jour_reunion    TEXT,
    heure_reunion   TEXT,
    lieu_reunion    TEXT,
    couleur         TEXT DEFAULT '#1A3060',
    icone           TEXT,
    actif           BOOLEAN DEFAULT TRUE,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ── membre_departements (N:M) ───────────────────────────────
CREATE TABLE IF NOT EXISTS membre_departements (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    membre_id       uuid REFERENCES membres(id) ON DELETE CASCADE,
    departement_id  uuid REFERENCES departements(id) ON DELETE CASCADE,
    date_entree     DATE DEFAULT CURRENT_DATE,
    date_sortie     DATE,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (membre_id, departement_id)
);

-- ── chef_departement ────────────────────────────────────────
-- Règle métier : UN SEUL chef actif par département. En revanche un même
-- chef peut diriger plusieurs départements (auth_routes.py renvoie une liste
-- `managed_departments`). La contrainte est donc :
--   • UNIQUE(user_id, departement_id) : une seule ligne par couple, ce qui
--     permet de réactiver un ancien chef sans créer de doublon (upsert du code).
--   • index unique partiel sur departement_id WHERE is_actif : garantit
--     l'unicité du chef EN POSTE, tout en conservant l'historique des anciens
--     chefs (lignes is_actif = FALSE).
CREATE TABLE IF NOT EXISTS chef_departement (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  departement_id  UUID NOT NULL REFERENCES departements(id) ON DELETE CASCADE,
  date_debut      DATE NOT NULL DEFAULT CURRENT_DATE,
  date_fin        DATE,
  is_actif        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, departement_id)
);

-- ── reunions_departement ────────────────────────────────────
CREATE TABLE IF NOT EXISTS reunions_departement (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  departement_id  UUID NOT NULL REFERENCES departements(id) ON DELETE CASCADE,
  titre           VARCHAR(255) NOT NULL,
  description     TEXT,
  date_reunion    TIMESTAMP WITH TIME ZONE NOT NULL,
  lieu            VARCHAR(255),
  is_en_ligne     BOOLEAN DEFAULT FALSE,
  lien_reunion    TEXT,
  created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ── evenements ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS evenements (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    titre           TEXT NOT NULL,
    description     TEXT,
    date_debut      TIMESTAMP WITH TIME ZONE NOT NULL,
    date_fin        TIMESTAMP WITH TIME ZONE,
    lieu            TEXT,
    type            TEXT NOT NULL CHECK (type IN ('culte', 'cellule', 'conference', 'jeunesse', 'concert', 'formation', 'autre')),
    image_url       TEXT,
    public          BOOLEAN DEFAULT TRUE,
    est_public      BOOLEAN DEFAULT TRUE,
    departement_id  uuid REFERENCES departements(id) ON DELETE SET NULL,
    couleur         TEXT DEFAULT '#1A3060',
    cree_par        uuid REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ── presences (événements généraux) ─────────────────────────
CREATE TABLE IF NOT EXISTS presences (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    membre_id uuid REFERENCES membres(id) ON DELETE CASCADE,
    membre_nom TEXT NOT NULL,
    evenement_id uuid REFERENCES evenements(id) ON DELETE CASCADE,
    evenement_titre TEXT NOT NULL,
    evenement_date TIMESTAMP WITH TIME ZONE NOT NULL,
    present BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (membre_id, evenement_id)
);

-- ── presences_reunion (réunions de département) ─────────────
CREATE TABLE IF NOT EXISTS presences_reunion (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reunion_id    UUID NOT NULL REFERENCES reunions_departement(id) ON DELETE CASCADE,
  membre_id     UUID NOT NULL REFERENCES membres(id) ON DELETE CASCADE,
  statut        presence_status NOT NULL DEFAULT 'ABSENT',
  note          TEXT,
  enregistre_par UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(reunion_id, membre_id)
);

-- ── rendez_vous (RDV pastoraux) ─────────────────────────────
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

-- ── annonces ────────────────────────────────────────────────
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

-- ── finances (livre comptable) ──────────────────────────────
CREATE TABLE IF NOT EXISTS finances (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type            transaction_type NOT NULL,
  montant         DECIMAL(12,2) NOT NULL CHECK (montant > 0),
  devise          VARCHAR(3) DEFAULT 'EUR',
  membre_id       UUID REFERENCES membres(id) ON DELETE SET NULL,
  est_anonyme     BOOLEAN DEFAULT FALSE,
  date_transaction DATE NOT NULL DEFAULT CURRENT_DATE,
  description     TEXT,
  recu_par        UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ── predications ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS predications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    titre TEXT NOT NULL,
    predicateur TEXT NOT NULL,
    date DATE NOT NULL,
    serie TEXT,
    resume TEXT,
    fichier_url TEXT,
    youtube_url TEXT,
    publie BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ── medias (galerie vidéo/audio) ────────────────────────────
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

-- ── galerie (photos) ────────────────────────────────────────
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

-- ── sessions (baptêmes, affermissement, formation) ──────────
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

-- ── inscriptions_sessions ───────────────────────────────────
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

-- ── rapports_departement ────────────────────────────────────
CREATE TABLE IF NOT EXISTS rapports_departement (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  departement_id  UUID NOT NULL REFERENCES departements(id) ON DELETE CASCADE,
  mois            INTEGER NOT NULL CHECK (mois BETWEEN 1 AND 12),
  annee           INTEGER NOT NULL,
  contenu         TEXT NOT NULL,
  nb_membres      INTEGER,
  nb_reunions     INTEGER,
  soumis_par      UUID REFERENCES users(id) ON DELETE SET NULL,
  soumis_le       TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(departement_id, mois, annee)
);

-- ── communications (envois collectifs) ──────────────────────
CREATE TABLE IF NOT EXISTS communications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    sujet TEXT NOT NULL,
    contenu TEXT NOT NULL,
    destinataires_type TEXT NOT NULL CHECK (destinataires_type IN ('tous_actifs', 'departement')),
    departement_id uuid REFERENCES departements(id) ON DELETE SET NULL,
    departement_nom TEXT,
    nb_destinataires INT DEFAULT 0,
    envoye_at TIMESTAMP WITH TIME ZONE,
    statut TEXT DEFAULT 'envoye',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ── messages (messagerie interne) ───────────────────────────
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

-- ── notifications ───────────────────────────────────────────
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

-- ── documents (ressources partagées) ────────────────────────
CREATE TABLE IF NOT EXISTS documents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom             VARCHAR(255) NOT NULL,
  description     TEXT,
  fichier_url     TEXT NOT NULL,
  type_mime       VARCHAR(100),
  taille_bytes    BIGINT,
  est_public      BOOLEAN DEFAULT FALSE,
  departement_id  UUID REFERENCES departements(id) ON DELETE SET NULL,
  uploade_par     UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ── audit_logs ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  action      VARCHAR(100) NOT NULL,
  table_cible VARCHAR(100),
  record_id   UUID,
  details     JSONB,
  ip_address  INET,
  created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ── parametres_systeme ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS parametres_systeme (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cle         VARCHAR(100) UNIQUE NOT NULL,
  valeur      TEXT,
  description TEXT,
  updated_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ── password_reset_tokens ───────────────────────────────────
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token       VARCHAR(255) UNIQUE NOT NULL,
  expires_at  TIMESTAMP WITH TIME ZONE NOT NULL,
  used        BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);


-- ============================================================
-- 3. RATTRAPAGE DE SCHÉMA (bases créées par une version antérieure)
-- ============================================================
-- ADD COLUMN IF NOT EXISTS est un no-op sur une base à jour.

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


-- ============================================================
-- 4. INDEX (performance)
-- ============================================================

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
CREATE INDEX IF NOT EXISTS idx_communications_created ON communications(created_at);


-- ============================================================
-- 5. TRIGGERS
-- ============================================================

-- search_path fixé : évite le détournement par des objets homonymes (advisor Supabase)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Triggers d'une version antérieure portant un autre nom : à supprimer, sinon
-- deux triggers identiques cohabiteraient sur la même table.
DROP TRIGGER IF EXISTS trg_rdv_updated_at ON rendez_vous;

-- DROP + CREATE plutôt que CREATE OR REPLACE TRIGGER (compatible < PG14)
DO $do$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'users','membres','eglise_parametres','rendez_vous',
    'medias','departements','evenements','predications'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I', 'trg_' || t || '_updated_at', t);
    EXECUTE format(
      'CREATE TRIGGER %I BEFORE UPDATE ON public.%I
         FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()',
      'trg_' || t || '_updated_at', t);
  END LOOP;
END
$do$;

-- ── Synchronisation des colonnes booléennes dupliquées ──
-- Les tables portent deux colonnes historiques pour le même état
-- (departements.actif/is_active, evenements.public/est_public). Le code écrit
-- `actif`/`public` ; ces triggers recopient la valeur vers la colonne miroir
-- pour qu'elles ne divergent jamais (vues, filtres et RLS restent cohérents).

CREATE OR REPLACE FUNCTION public.sync_departement_actif()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.is_active := COALESCE(NEW.actif, NEW.is_active, TRUE);
  NEW.actif     := NEW.is_active;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_departements_sync_actif ON departements;
CREATE TRIGGER trg_departements_sync_actif
  BEFORE INSERT OR UPDATE ON departements
  FOR EACH ROW EXECUTE FUNCTION public.sync_departement_actif();

CREATE OR REPLACE FUNCTION public.sync_evenement_public()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.est_public := COALESCE(NEW.public, NEW.est_public, TRUE);
  NEW.public     := NEW.est_public;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_evenements_sync_public ON evenements;
CREATE TRIGGER trg_evenements_sync_public
  BEFORE INSERT OR UPDATE ON evenements
  FOR EACH ROW EXECUTE FUNCTION public.sync_evenement_public();

-- ── Chef de département : chef_departement ↔ departements.responsable_id ──
-- Le code écrit les deux (departement_workspace_routes.py). Ces triggers
-- garantissent qu'ils ne divergent jamais, quel que soit le point d'entrée.
-- pg_trigger_depth() = 1 : on n'agit que sur une écriture directe, ce qui
-- empêche les deux triggers de se rappeler mutuellement à l'infini.

-- Sens 1 : chef_departement → departements.responsable_id
CREATE OR REPLACE FUNCTION public.sync_chef_vers_departement()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_dept uuid := COALESCE(NEW.departement_id, OLD.departement_id);
  v_chef uuid;
BEGIN
  IF pg_trigger_depth() > 1 THEN
    RETURN NULL;
  END IF;

  SELECT cd.user_id INTO v_chef
    FROM public.chef_departement cd
   WHERE cd.departement_id = v_dept AND cd.is_actif
   LIMIT 1;

  UPDATE public.departements d
     SET responsable_id = v_chef
   WHERE d.id = v_dept
     AND d.responsable_id IS DISTINCT FROM v_chef;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_chef_vers_departement ON chef_departement;
CREATE TRIGGER trg_chef_vers_departement
  AFTER INSERT OR UPDATE OR DELETE ON chef_departement
  FOR EACH ROW EXECUTE FUNCTION public.sync_chef_vers_departement();

-- Sens 2 : departements.responsable_id → chef_departement
-- Un nouveau responsable relève l'ancien de ses fonctions (un seul chef actif).
CREATE OR REPLACE FUNCTION public.sync_departement_vers_chef()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF pg_trigger_depth() > 1 THEN
    RETURN NULL;
  END IF;

  UPDATE public.chef_departement
     SET is_actif = FALSE,
         date_fin = COALESCE(date_fin, CURRENT_DATE)
   WHERE departement_id = NEW.id
     AND is_actif
     AND user_id IS DISTINCT FROM NEW.responsable_id;

  IF NEW.responsable_id IS NOT NULL THEN
    INSERT INTO public.chef_departement (user_id, departement_id, is_actif)
    VALUES (NEW.responsable_id, NEW.id, TRUE)
    ON CONFLICT (user_id, departement_id)
    DO UPDATE SET is_actif = TRUE, date_fin = NULL;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_departement_vers_chef ON departements;
CREATE TRIGGER trg_departement_vers_chef
  AFTER INSERT OR UPDATE OF responsable_id ON departements
  FOR EACH ROW EXECUTE FUNCTION public.sync_departement_vers_chef();

-- Réconcilier l'existant : chef_departement fait foi quand il porte un chef
-- actif ; sinon un responsable_id orphelin est matérialisé en chef actif.
UPDATE departements d
   SET responsable_id = cd.user_id
  FROM chef_departement cd
 WHERE cd.departement_id = d.id
   AND cd.is_actif
   AND d.responsable_id IS DISTINCT FROM cd.user_id;

INSERT INTO chef_departement (user_id, departement_id, is_actif)
SELECT d.responsable_id, d.id, TRUE
  FROM departements d
 WHERE d.responsable_id IS NOT NULL
   AND NOT EXISTS (
     SELECT 1 FROM chef_departement cd
      WHERE cd.departement_id = d.id AND cd.is_actif
   )
ON CONFLICT (user_id, departement_id) DO UPDATE SET is_actif = TRUE;

-- Réaligner les lignes déjà présentes
UPDATE departements SET is_active = COALESCE(actif, is_active, TRUE)
  WHERE is_active IS DISTINCT FROM COALESCE(actif, is_active, TRUE);
UPDATE evenements   SET est_public = COALESCE(public, est_public, TRUE)
  WHERE est_public IS DISTINCT FROM COALESCE(public, est_public, TRUE);


-- ============================================================
-- 6. DONNÉES INITIALES
-- ============================================================

-- ── Programme des cultes ────────────────────────────────────
-- Lundi     18h30 — Intercession
-- Jeudi     18h30 — Culte d'enseignement
-- Dimanche  11h00 — Culte dominical

INSERT INTO parametres_systeme (cle, valeur, description) VALUES
  ('church_name',      'Rehoboth Church International', 'Nom de l église'),
  ('church_email',     'contact@rehobothchurch.org',    'Email principal'),
  ('church_phone',     '',                              'Téléphone'),
  ('church_address',   '',                              'Adresse physique'),
  ('youtube_channel',  '',                              'URL chaîne YouTube'),
  ('facebook_page',    '',                              'URL page Facebook'),
  ('culte_horaires',
   'Lundi 18h30 (intercession) · Jeudi 18h30 (enseignement) · Dimanche 11h00 (culte dominical)',
                                                        'Horaires des cultes'),
  ('rdv_pasteur_info', 'Entretien avec les pasteurs : s adresser au secrétariat',
                                                        'Modalités de prise de rendez-vous pastoral'),
  ('maintenance_mode', 'false',                         'Mode maintenance')
ON CONFLICT (cle) DO NOTHING;

-- Base existante : remplacer l'ancien horaire par défaut, mais SEULEMENT s'il
-- n'a pas déjà été personnalisé depuis l'interface d'administration.
UPDATE parametres_systeme
   SET valeur = 'Lundi 18h30 (intercession) · Jeudi 18h30 (enseignement) · Dimanche 11h00 (culte dominical)',
       updated_at = NOW()
 WHERE cle = 'culte_horaires'
   AND valeur IN ('Dimanche 10h00 - 12h30', 'Dimanche 10h00 & 17h00', '');

-- ── Fiche église : horaires affichés sur la page d'accueil ──
-- (Accueil.jsx lit eglise_parametres.horaires)
INSERT INTO eglise_parametres (nom, horaires)
SELECT 'Rehoboth Church International',
       'Lundi 18h30 (intercession) · Jeudi 18h30 (enseignement) · Dimanche 11h00 (culte dominical)'
 WHERE NOT EXISTS (SELECT 1 FROM eglise_parametres);

UPDATE eglise_parametres
   SET horaires = 'Lundi 18h30 (intercession) · Jeudi 18h30 (enseignement) · Dimanche 11h00 (culte dominical)'
 WHERE horaires IS NULL OR btrim(horaires) = '';

-- ── Départements officiels ──────────────────────────────────
-- Liste réelle de l'église (affichage public : Departements.jsx, et
-- adhésion : RejoindreDepartement.jsx). Seed uniquement si le nom est absent,
-- donc sans écraser un département déjà configuré.
INSERT INTO departements (nom, description, type, couleur)
SELECT seed.nom, seed.description, seed.type, seed.couleur
FROM (VALUES
  ('Chorale',        'Louange, adoration et conduite musicale des cultes',   'chorale',        '#DC2626'),
  ('Protocol',       'Accueil, placement et bon déroulement des cultes',     'equipe_service', '#1D4ED8'),
  ('Media',          'Son, vidéo, photo et communication numérique',         'equipe_service', '#0EA5E9'),
  ('Évangélisation', 'Annonce de l Évangile, missions et sorties',           'equipe_service', '#D97706'),
  ('Social',         'Entraide, visites et action sociale',                  'equipe_service', '#059669'),
  ('Drama',          'Expression scénique, théâtre et mise en scène',        'equipe_service', '#7C3AED'),
  ('Rédaction',      'Rédaction, publications et archives de l église',      'equipe_service', '#374151'),
  ('Partenaire',     'Partenariat et soutien de l œuvre',                    'equipe_service', '#B45309'),
  ('Interprétariat', 'Traduction et interprétation pendant les cultes',      'equipe_service', '#DB2777')
) AS seed(nom, description, type, couleur)
WHERE NOT EXISTS (
  SELECT 1 FROM departements d WHERE lower(d.nom) = lower(seed.nom)
);

-- Compléter le type des départements de la liste officielle qui existaient
-- déjà sans type (ex. « Évangélisation » issu de l'ancien seed).
UPDATE departements d
   SET type = seed.type
  FROM (VALUES
    ('chorale',        'chorale'),
    ('protocol',       'equipe_service'),
    ('media',          'equipe_service'),
    ('évangélisation', 'equipe_service'),
    ('social',         'equipe_service'),
    ('drama',          'equipe_service'),
    ('rédaction',      'equipe_service'),
    ('partenaire',     'equipe_service'),
    ('interprétariat', 'equipe_service')
  ) AS seed(nom, type)
 WHERE lower(d.nom) = seed.nom
   AND d.type IS DISTINCT FROM seed.type
   AND d.type IS NULL;

-- ── Retrait des départements d'exemple de l'ancien seed ─────
-- Uniquement ceux restés VIDES : aucun membre, chef, réunion, rapport,
-- événement, annonce, document ni communication rattaché. Un département
-- déjà utilisé est conservé (il sera à désactiver à la main si besoin).
DO $do$
DECLARE
  r       record;
  v_noms  text[] := ARRAY['jeunesse','louange & adoration','femmes','hommes',
                          'intercession','administration'];
  v_sup   text[] := ARRAY[]::text[];
  v_gard  text[] := ARRAY[]::text[];
BEGIN
  FOR r IN SELECT id, nom FROM departements WHERE lower(nom) = ANY(v_noms)
  LOOP
    IF NOT EXISTS (SELECT 1 FROM membre_departements  WHERE departement_id = r.id)
   AND NOT EXISTS (SELECT 1 FROM chef_departement     WHERE departement_id = r.id)
   AND NOT EXISTS (SELECT 1 FROM reunions_departement WHERE departement_id = r.id)
   AND NOT EXISTS (SELECT 1 FROM rapports_departement WHERE departement_id = r.id)
   AND NOT EXISTS (SELECT 1 FROM evenements           WHERE departement_id = r.id)
   AND NOT EXISTS (SELECT 1 FROM annonces             WHERE departement_id = r.id)
   AND NOT EXISTS (SELECT 1 FROM documents            WHERE departement_id = r.id)
   AND NOT EXISTS (SELECT 1 FROM communications       WHERE departement_id = r.id)
   AND NOT EXISTS (SELECT 1 FROM membres m JOIN users u ON u.id = m.user_id
                    WHERE u.id = (SELECT responsable_id FROM departements WHERE id = r.id))
    THEN
      DELETE FROM departements WHERE id = r.id;
      v_sup := v_sup || r.nom;
    ELSE
      v_gard := v_gard || r.nom;
    END IF;
  END LOOP;

  IF array_length(v_sup, 1) > 0 THEN
    RAISE NOTICE 'Départements d exemple supprimés (vides) : %', array_to_string(v_sup, ', ');
  END IF;
  IF array_length(v_gard, 1) > 0 THEN
    RAISE NOTICE 'Départements d exemple CONSERVÉS car utilisés : %', array_to_string(v_gard, ', ');
  END IF;
END
$do$;


-- ============================================================
-- 7. VUES
-- ============================================================
-- security_invoker = on → les vues s'exécutent avec les droits de l'appelant
-- et respectent donc le RLS (sinon elles le contournent — advisor Supabase).

CREATE OR REPLACE VIEW v_membres_complets WITH (security_invoker = on) AS
SELECT
  m.id,
  m.nom,
  m.prenom,
  m.email,
  m.telephone,
  m.date_adhesion,
  m.est_baptise,
  u.role,
  u.is_active,
  d.nom AS departement_principal
FROM membres m
LEFT JOIN users u ON m.user_id = u.id
LEFT JOIN membre_departements md ON m.id = md.membre_id AND md.is_active = TRUE
LEFT JOIN departements d ON md.departement_id = d.id;

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

CREATE OR REPLACE VIEW v_chef_departements WITH (security_invoker = on) AS
SELECT
  u.id        AS user_id,
  u.email,
  m.prenom,
  m.nom,
  d.id        AS departement_id,
  d.nom       AS departement_nom,
  cd.date_debut,
  cd.date_fin,
  cd.is_actif
FROM chef_departement cd
JOIN users u        ON cd.user_id        = u.id
JOIN departements d ON cd.departement_id = d.id
LEFT JOIN membres m ON u.id = m.user_id
WHERE cd.is_actif = TRUE;

CREATE OR REPLACE VIEW v_statistiques_globales WITH (security_invoker = on) AS
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


-- ============================================================
-- 8. FONCTIONS D'AIDE POUR LE RLS
-- ============================================================
-- SECURITY DEFINER : elles lisent `users` / `membres` en contournant le RLS.
-- C'est indispensable, sinon une politique sur `users` qui interroge `users`
-- provoque une récursion infinie (erreur 42P17).
-- search_path vidé + noms qualifiés : pas de détournement possible.

-- Identité de l'appelant. Passer par ce wrapper plutôt que par auth.uid()
-- directement dans les politiques : sur une instance PostgreSQL nue, les rôles
-- anon/authenticated n'ont pas forcément USAGE sur le schéma auth, et la
-- politique échouerait avec "permission denied for schema auth".
CREATE OR REPLACE FUNCTION public.app_uid()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$ SELECT auth.uid(); $$;

CREATE OR REPLACE FUNCTION public.app_role()
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT COALESCE(
    (SELECT u.role FROM public.users u
      WHERE u.id = (SELECT auth.uid()) AND u.is_active),
    'ANONYME'
  );
$$;

-- SUPER_ADMIN uniquement
CREATE OR REPLACE FUNCTION public.app_is_super()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$ SELECT public.app_role() = 'SUPER_ADMIN'; $$;

-- ADMIN_ROLES de middlewares/rbac.py
CREATE OR REPLACE FUNCTION public.app_is_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$ SELECT public.app_role() IN ('SUPER_ADMIN','PASTEUR','SECRETAIRE'); $$;

-- Accès aux données financières
CREATE OR REPLACE FUNCTION public.app_is_finance()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$ SELECT public.app_role() IN ('SUPER_ADMIN','PASTEUR'); $$;

-- MEDIA_ROLES de middlewares/rbac.py
CREATE OR REPLACE FUNCTION public.app_is_media()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$ SELECT public.app_role() IN ('SUPER_ADMIN','PASTEUR','EQUIPE_MEDIA'); $$;

-- Un utilisateur authentifié quelconque
CREATE OR REPLACE FUNCTION public.app_is_authenticated()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$ SELECT (SELECT auth.uid()) IS NOT NULL; $$;

-- Fiche membre liée au compte connecté
CREATE OR REPLACE FUNCTION public.app_membre_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT m.id FROM public.membres m WHERE m.user_id = (SELECT auth.uid());
$$;

-- L'utilisateur dirige-t-il ce département ? (un seul chef actif par
-- département, mais un chef peut en diriger plusieurs)
CREATE OR REPLACE FUNCTION public.app_is_chef(p_departement_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT p_departement_id IS NOT NULL AND (
    EXISTS (
      SELECT 1 FROM public.chef_departement cd
       WHERE cd.user_id = (SELECT auth.uid())
         AND cd.departement_id = p_departement_id
         AND cd.is_actif
    )
    OR EXISTS (
      SELECT 1 FROM public.departements d
       WHERE d.id = p_departement_id
         AND d.responsable_id = (SELECT auth.uid())
    )
  );
$$;

-- L'utilisateur appartient-il à ce département ?
CREATE OR REPLACE FUNCTION public.app_is_dept_member(p_departement_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.membre_departements md
     WHERE md.departement_id = p_departement_id
       AND md.membre_id = public.app_membre_id()
       AND COALESCE(md.is_active, TRUE)
  );
$$;

DO $do$
DECLARE f text;
BEGIN
  FOREACH f IN ARRAY ARRAY[
    'public.app_uid()', 'public.app_role()', 'public.app_is_super()', 'public.app_is_admin()',
    'public.app_is_finance()', 'public.app_is_media()', 'public.app_is_authenticated()',
    'public.app_membre_id()', 'public.app_is_chef(uuid)', 'public.app_is_dept_member(uuid)'
  ] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO anon, authenticated, service_role', f);
  END LOOP;
END
$do$;


-- ============================================================
-- 9. ROW LEVEL SECURITY
-- ============================================================
-- Rappel : `service_role` (backend Flask) a BYPASSRLS — rien de ce qui suit
-- ne s'applique à l'API. Ces politiques protègent l'accès direct PostgREST.
--
-- NB : (SELECT public.app_uid()) au lieu de auth.uid() → évalué une seule fois par
-- requête au lieu d'une fois par ligne (advisor Supabase "Auth RLS Init Plan").

-- 9a. Privilèges de table : c'est le RLS qui filtre, pas les GRANT.
DO $do$
BEGIN
  EXECUTE 'GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role';
  EXECUTE 'GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon';
  EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated';
  EXECUTE 'GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role';
  EXECUTE 'ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO anon';
  EXECUTE 'ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated';
EXCEPTION WHEN insufficient_privilege OR undefined_object THEN
  RAISE NOTICE 'GRANT partiellement ignoré (privilèges insuffisants).';
END
$do$;

-- 9b. Activer le RLS sur TOUTES les tables du schéma public,
--     y compris celles ajoutées ultérieurement hors de ce script.
DO $do$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT c.relname
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public'
       AND c.relkind = 'r'
       AND NOT c.relrowsecurity
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.relname);
    RAISE NOTICE 'RLS activé sur %', r.relname;
  END LOOP;
END
$do$;

-- 9c. Repartir d'une ardoise propre : ce fichier est la source de vérité des
--     politiques du schéma public. On supprime tout puis on recrée.
DO $do$
DECLARE r record;
BEGIN
  FOR r IN SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END
$do$;


-- ── roles : référentiel, lisible par tout compte connecté ───
CREATE POLICY roles_select ON roles
  FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY roles_admin_write ON roles
  FOR ALL TO authenticated
  USING (public.app_is_super()) WITH CHECK (public.app_is_super());


-- ── users : son propre compte, tout pour les admins ─────────
CREATE POLICY users_select_own_or_admin ON users
  FOR SELECT TO authenticated
  USING (id = (SELECT public.app_uid()) OR public.app_is_admin());

-- L'utilisateur peut modifier sa propre ligne mais PAS son rôle ni son
-- activation (contrôle via WITH CHECK sur les valeurs cibles).
CREATE POLICY users_update_own ON users
  FOR UPDATE TO authenticated
  USING (id = (SELECT public.app_uid()))
  WITH CHECK (
    id = (SELECT public.app_uid())
    AND role = public.app_role()
    AND is_active = TRUE
  );

CREATE POLICY users_admin_all ON users
  FOR ALL TO authenticated
  USING (public.app_is_super()) WITH CHECK (public.app_is_super());


-- ── eglise_parametres : vitrine publique ────────────────────
CREATE POLICY eglise_select_public ON eglise_parametres
  FOR SELECT TO anon, authenticated USING (TRUE);
CREATE POLICY eglise_write_admin ON eglise_parametres
  FOR ALL TO authenticated
  USING (public.app_is_finance()) WITH CHECK (public.app_is_finance());


-- ── membres : sa fiche, les admins, le chef de son département ──
CREATE POLICY membres_select ON membres
  FOR SELECT TO authenticated
  USING (
    user_id = (SELECT public.app_uid())
    OR public.app_is_admin()
    OR EXISTS (
      SELECT 1 FROM membre_departements md
       WHERE md.membre_id = membres.id
         AND COALESCE(md.is_active, TRUE)
         AND public.app_is_chef(md.departement_id)
    )
  );

CREATE POLICY membres_update_own ON membres
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT public.app_uid()))
  WITH CHECK (user_id = (SELECT public.app_uid()));

CREATE POLICY membres_admin_all ON membres
  FOR ALL TO authenticated
  USING (public.app_is_admin()) WITH CHECK (public.app_is_admin());


-- ── departements : annuaire public (actifs), écriture admin/chef ──
CREATE POLICY departements_select_public ON departements
  FOR SELECT TO anon USING (COALESCE(is_active, TRUE));
CREATE POLICY departements_select_auth ON departements
  FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY departements_update_chef ON departements
  FOR UPDATE TO authenticated
  USING (public.app_is_chef(id)) WITH CHECK (public.app_is_chef(id));
CREATE POLICY departements_admin_all ON departements
  FOR ALL TO authenticated
  USING (public.app_is_admin()) WITH CHECK (public.app_is_admin());


-- ── membre_departements : sa propre affectation, chef, admin ──
CREATE POLICY membre_dept_select ON membre_departements
  FOR SELECT TO authenticated
  USING (
    membre_id = public.app_membre_id()
    OR public.app_is_admin()
    OR public.app_is_chef(departement_id)
  );
CREATE POLICY membre_dept_write_chef ON membre_departements
  FOR ALL TO authenticated
  USING (public.app_is_admin() OR public.app_is_chef(departement_id))
  WITH CHECK (public.app_is_admin() OR public.app_is_chef(departement_id));


-- ── chef_departement : lecture admin + intéressé, écriture super/pasteur ──
CREATE POLICY chef_dept_select ON chef_departement
  FOR SELECT TO authenticated
  USING (user_id = (SELECT public.app_uid()) OR public.app_is_admin());
CREATE POLICY chef_dept_write ON chef_departement
  FOR ALL TO authenticated
  USING (public.app_is_finance()) WITH CHECK (public.app_is_finance());


-- ── reunions_departement : membres du département, chef, admin ──
CREATE POLICY reunions_select ON reunions_departement
  FOR SELECT TO authenticated
  USING (
    public.app_is_admin()
    OR public.app_is_chef(departement_id)
    OR public.app_is_dept_member(departement_id)
  );
CREATE POLICY reunions_write ON reunions_departement
  FOR ALL TO authenticated
  USING (public.app_is_admin() OR public.app_is_chef(departement_id))
  WITH CHECK (public.app_is_admin() OR public.app_is_chef(departement_id));


-- ── evenements : agenda public, écriture équipe événements ──
CREATE POLICY evenements_select_public ON evenements
  FOR SELECT TO anon USING (COALESCE(est_public, TRUE));
CREATE POLICY evenements_select_auth ON evenements
  FOR SELECT TO authenticated
  USING (
    COALESCE(est_public, TRUE)
    OR public.app_is_admin()
    OR public.app_is_media()
    OR public.app_is_chef(departement_id)
    OR public.app_is_dept_member(departement_id)
  );
CREATE POLICY evenements_write ON evenements
  FOR ALL TO authenticated
  USING (
    public.app_is_admin() OR public.app_is_media() OR public.app_is_chef(departement_id)
  )
  WITH CHECK (
    public.app_is_admin() OR public.app_is_media() OR public.app_is_chef(departement_id)
  );


-- ── presences : sa propre présence, sinon admin/chef ────────
CREATE POLICY presences_select ON presences
  FOR SELECT TO authenticated
  USING (membre_id = public.app_membre_id() OR public.app_is_admin());
CREATE POLICY presences_write ON presences
  FOR ALL TO authenticated
  USING (public.app_is_admin()) WITH CHECK (public.app_is_admin());


-- ── presences_reunion : idem, portée par le département ─────
CREATE POLICY presences_reunion_select ON presences_reunion
  FOR SELECT TO authenticated
  USING (
    membre_id = public.app_membre_id()
    OR public.app_is_admin()
    OR EXISTS (
      SELECT 1 FROM reunions_departement rd
       WHERE rd.id = presences_reunion.reunion_id
         AND public.app_is_chef(rd.departement_id)
    )
  );
CREATE POLICY presences_reunion_write ON presences_reunion
  FOR ALL TO authenticated
  USING (
    public.app_is_admin()
    OR EXISTS (
      SELECT 1 FROM reunions_departement rd
       WHERE rd.id = presences_reunion.reunion_id
         AND public.app_is_chef(rd.departement_id)
    )
  )
  WITH CHECK (
    public.app_is_admin()
    OR EXISTS (
      SELECT 1 FROM reunions_departement rd
       WHERE rd.id = presences_reunion.reunion_id
         AND public.app_is_chef(rd.departement_id)
    )
  );


-- ── rendez_vous : son RDV, sinon pasteur/secrétariat ────────
-- La demande publique (visiteur non connecté) passe par le backend, pas par
-- PostgREST : aucun accès `anon` ici.
CREATE POLICY rdv_select_own ON rendez_vous
  FOR SELECT TO authenticated
  USING (
    membre_id = public.app_membre_id()
    OR cree_par = (SELECT public.app_uid())
    OR public.app_is_admin()
  );
CREATE POLICY rdv_insert_own ON rendez_vous
  FOR INSERT TO authenticated
  WITH CHECK (
    cree_par = (SELECT public.app_uid())
    OR membre_id = public.app_membre_id()
    OR public.app_is_admin()
  );
CREATE POLICY rdv_admin_all ON rendez_vous
  FOR ALL TO authenticated
  USING (public.app_is_admin()) WITH CHECK (public.app_is_admin());


-- ── annonces : publiques en lecture anonyme ─────────────────
CREATE POLICY annonces_select_public ON annonces
  FOR SELECT TO anon
  USING (
    COALESCE(est_publique, TRUE)
    AND COALESCE(is_active, TRUE)
    AND (date_expiration IS NULL OR date_expiration > NOW())
  );
CREATE POLICY annonces_select_auth ON annonces
  FOR SELECT TO authenticated
  USING (
    COALESCE(est_publique, TRUE)
    OR public.app_is_admin()
    OR public.app_is_chef(departement_id)
    OR public.app_is_dept_member(departement_id)
  );
CREATE POLICY annonces_write ON annonces
  FOR ALL TO authenticated
  USING (public.app_is_admin() OR public.app_is_chef(departement_id))
  WITH CHECK (public.app_is_admin() OR public.app_is_chef(departement_id));


-- ── finances : SUPER_ADMIN et PASTEUR uniquement ────────────
CREATE POLICY finances_finance_only ON finances
  FOR ALL TO authenticated
  USING (public.app_is_finance()) WITH CHECK (public.app_is_finance());


-- ── predications : catalogue public si publié ───────────────
CREATE POLICY predications_select_public ON predications
  FOR SELECT TO anon USING (COALESCE(publie, FALSE));
CREATE POLICY predications_select_auth ON predications
  FOR SELECT TO authenticated
  USING (COALESCE(publie, FALSE) OR public.app_is_media());
CREATE POLICY predications_write_media ON predications
  FOR ALL TO authenticated
  USING (public.app_is_media()) WITH CHECK (public.app_is_media());


-- ── medias ──────────────────────────────────────────────────
CREATE POLICY medias_select_public ON medias
  FOR SELECT TO anon USING (COALESCE(est_public, FALSE));
CREATE POLICY medias_select_auth ON medias
  FOR SELECT TO authenticated
  USING (COALESCE(est_public, FALSE) OR public.app_is_media());
CREATE POLICY medias_write_media ON medias
  FOR ALL TO authenticated
  USING (public.app_is_media()) WITH CHECK (public.app_is_media());


-- ── galerie ─────────────────────────────────────────────────
CREATE POLICY galerie_select_public ON galerie
  FOR SELECT TO anon USING (COALESCE(est_public, FALSE));
CREATE POLICY galerie_select_auth ON galerie
  FOR SELECT TO authenticated
  USING (COALESCE(est_public, FALSE) OR public.app_is_media());
CREATE POLICY galerie_write_media ON galerie
  FOR ALL TO authenticated
  USING (public.app_is_media()) WITH CHECK (public.app_is_media());


-- ── sessions : programme visible, inscriptions ouvertes ─────
CREATE POLICY sessions_select_public ON sessions
  FOR SELECT TO anon USING (COALESCE(est_ouvert, FALSE));
CREATE POLICY sessions_select_auth ON sessions
  FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY sessions_write_admin ON sessions
  FOR ALL TO authenticated
  USING (public.app_is_admin() OR responsable_id = (SELECT public.app_uid()))
  WITH CHECK (public.app_is_admin() OR responsable_id = (SELECT public.app_uid()));


-- ── inscriptions_sessions : la sienne, sinon admin/responsable ──
CREATE POLICY inscriptions_select ON inscriptions_sessions
  FOR SELECT TO authenticated
  USING (
    membre_id = public.app_membre_id()
    OR public.app_is_admin()
    OR EXISTS (
      SELECT 1 FROM sessions s
       WHERE s.id = inscriptions_sessions.session_id
         AND s.responsable_id = (SELECT public.app_uid())
    )
  );
CREATE POLICY inscriptions_insert_self ON inscriptions_sessions
  FOR INSERT TO authenticated
  WITH CHECK (
    membre_id = public.app_membre_id()
    AND EXISTS (
      SELECT 1 FROM sessions s
       WHERE s.id = inscriptions_sessions.session_id
         AND COALESCE(s.est_ouvert, FALSE)
    )
  );
CREATE POLICY inscriptions_delete_self ON inscriptions_sessions
  FOR DELETE TO authenticated
  USING (membre_id = public.app_membre_id());
CREATE POLICY inscriptions_admin_all ON inscriptions_sessions
  FOR ALL TO authenticated
  USING (public.app_is_admin()) WITH CHECK (public.app_is_admin());


-- ── rapports_departement : chef du département + admin ──────
CREATE POLICY rapports_select ON rapports_departement
  FOR SELECT TO authenticated
  USING (public.app_is_admin() OR public.app_is_chef(departement_id));
CREATE POLICY rapports_write ON rapports_departement
  FOR ALL TO authenticated
  USING (public.app_is_admin() OR public.app_is_chef(departement_id))
  WITH CHECK (public.app_is_admin() OR public.app_is_chef(departement_id));


-- ── communications : historique d'envois, admin uniquement ──
CREATE POLICY communications_admin ON communications
  FOR ALL TO authenticated
  USING (public.app_is_admin()) WITH CHECK (public.app_is_admin());


-- ── messages : expéditeur et destinataire uniquement ────────
CREATE POLICY messages_select_own ON messages
  FOR SELECT TO authenticated
  USING (
    expediteur_id = (SELECT public.app_uid()) OR destinataire_id = (SELECT public.app_uid())
  );
CREATE POLICY messages_insert_as_self ON messages
  FOR INSERT TO authenticated
  WITH CHECK (expediteur_id = (SELECT public.app_uid()));
-- Le destinataire peut marquer lu/archivé, l'expéditeur corriger son message.
CREATE POLICY messages_update_own ON messages
  FOR UPDATE TO authenticated
  USING (
    expediteur_id = (SELECT public.app_uid()) OR destinataire_id = (SELECT public.app_uid())
  )
  WITH CHECK (
    expediteur_id = (SELECT public.app_uid()) OR destinataire_id = (SELECT public.app_uid())
  );
CREATE POLICY messages_delete_own ON messages
  FOR DELETE TO authenticated
  USING (expediteur_id = (SELECT public.app_uid()));


-- ── notifications : les siennes ─────────────────────────────
CREATE POLICY notifications_select_own ON notifications
  FOR SELECT TO authenticated USING (user_id = (SELECT public.app_uid()));
CREATE POLICY notifications_update_own ON notifications
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT public.app_uid()))
  WITH CHECK (user_id = (SELECT public.app_uid()));
CREATE POLICY notifications_delete_own ON notifications
  FOR DELETE TO authenticated USING (user_id = (SELECT public.app_uid()));
CREATE POLICY notifications_admin_all ON notifications
  FOR ALL TO authenticated
  USING (public.app_is_admin()) WITH CHECK (public.app_is_admin());


-- ── documents : public, département, admin ──────────────────
CREATE POLICY documents_select_public ON documents
  FOR SELECT TO anon USING (COALESCE(est_public, FALSE));
CREATE POLICY documents_select_auth ON documents
  FOR SELECT TO authenticated
  USING (
    COALESCE(est_public, FALSE)
    OR public.app_is_admin()
    OR public.app_is_chef(departement_id)
    OR public.app_is_dept_member(departement_id)
  );
CREATE POLICY documents_write ON documents
  FOR ALL TO authenticated
  USING (public.app_is_admin() OR public.app_is_chef(departement_id))
  WITH CHECK (public.app_is_admin() OR public.app_is_chef(departement_id));


-- ── audit_logs : lecture SUPER_ADMIN, écriture backend seulement ──
CREATE POLICY audit_logs_select_super ON audit_logs
  FOR SELECT TO authenticated USING (public.app_is_super());


-- ── parametres_systeme : lecture connectée, écriture super/pasteur ──
CREATE POLICY parametres_select ON parametres_systeme
  FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY parametres_write ON parametres_systeme
  FOR ALL TO authenticated
  USING (public.app_is_finance()) WITH CHECK (public.app_is_finance());


-- ── password_reset_tokens : AUCUNE politique ────────────────
-- RLS activé sans politique = table totalement inaccessible via PostgREST.
-- Seul le backend (service_role) peut y toucher. C'est voulu.
DO $do$
BEGIN
  EXECUTE 'REVOKE ALL ON TABLE public.password_reset_tokens FROM anon, authenticated';
EXCEPTION WHEN insufficient_privilege OR undefined_object THEN NULL;
END
$do$;


-- ============================================================
-- 10. VÉRIFICATION FINALE
-- ============================================================
-- Signale les tables sans RLS ou avec RLS mais aucune politique
-- (à part celles volontairement fermées).

DO $do$
DECLARE
  r            record;
  sans_rls     int := 0;
  sans_policy  text[] := ARRAY[]::text[];
BEGIN
  FOR r IN
    SELECT c.relname,
           c.relrowsecurity,
           (SELECT count(*) FROM pg_policies p
             WHERE p.schemaname = 'public' AND p.tablename = c.relname) AS nb
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND c.relkind = 'r'
     ORDER BY c.relname
  LOOP
    IF NOT r.relrowsecurity THEN
      sans_rls := sans_rls + 1;
      RAISE WARNING 'RLS NON ACTIVÉ sur public.%', r.relname;
    ELSIF r.nb = 0 THEN
      sans_policy := sans_policy || r.relname;
    END IF;
  END LOOP;

  RAISE NOTICE '--------------------------------------------------';
  RAISE NOTICE 'RLS : % table(s) sans RLS', sans_rls;
  RAISE NOTICE 'Tables fermées (RLS sans politique) : %',
               COALESCE(array_to_string(sans_policy, ', '), 'aucune');
  RAISE NOTICE 'Le backend Flask (service_role) n''est pas affecté.';
  RAISE NOTICE '--------------------------------------------------';
END
$do$;
