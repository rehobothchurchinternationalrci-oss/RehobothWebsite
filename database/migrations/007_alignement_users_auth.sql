-- ============================================================
-- MIGRATION 007 — Alignement de public.users.id sur auth.users.id
-- ============================================================
-- Le login résout le compte applicatif par l'uid Supabase Auth. Les comptes de
-- chefs de département créés avant le correctif ont reçu un id aléatoire
-- (gen_random_uuid()) sans rapport avec cet uid : la connexion échouait avec
-- « identifiants incorrects » alors que le mot de passe était bon, puisque la
-- synchronisation tentait d'insérer une seconde ligne portant le même email.
--
-- Cette migration renumérote les lignes public.users concernées avec l'uid
-- auth.users correspondant, en reportant au passage toutes les références
-- (chef_departement, departements.responsable_id, membres.user_id, et toute
-- autre clé étrangère vers users(id)).
--
-- Rejouable : peut être exécutée plusieurs fois sans erreur ni doublon.
-- À exécuter dans l'éditeur SQL Supabase, dans l'ordre des numéros.
--
-- Annulation : voir 007_rollback.sql (aucune, par construction)
-- ============================================================

DO $do$
DECLARE
  v_ligne    record;
  v_fk       record;
  v_provisoire text;
BEGIN
  IF to_regclass('auth.users') IS NULL THEN
    RAISE NOTICE 'auth.users absent (base hors Supabase) : rien à faire.';
    RETURN;
  END IF;

  FOR v_ligne IN
    EXECUTE $q$
      SELECT u.id AS ancien_id, a.id AS nouvel_id, u.email
        FROM public.users u
        JOIN auth.users  a ON lower(a.email) = lower(u.email)
       WHERE u.id <> a.id
    $q$
  LOOP
    -- Un id déjà pris côté public.users signale deux lignes pour la même
    -- personne : impossible de choisir laquelle garder sans arbitrage humain.
    IF EXISTS (SELECT 1 FROM public.users WHERE id = v_ligne.nouvel_id) THEN
      RAISE WARNING 'users % : l''id % existe déjà, ligne ignorée.',
        v_ligne.email, v_ligne.nouvel_id;
      CONTINUE;
    END IF;

    -- L'email est UNIQUE : on le libère le temps de faire coexister l'ancienne
    -- et la nouvelle ligne, le temps de déplacer les références.
    v_provisoire := v_ligne.email || '.migration007';
    UPDATE public.users SET email = v_provisoire WHERE id = v_ligne.ancien_id;

    INSERT INTO public.users (id, email, password_hash, role, is_active,
                              email_verified, must_change_password,
                              last_login, created_at, updated_at)
    SELECT v_ligne.nouvel_id, v_ligne.email, password_hash, role, is_active,
           email_verified, must_change_password, last_login, created_at, NOW()
      FROM public.users WHERE id = v_ligne.ancien_id;

    -- Reporter toutes les références, quelle que soit la table : la liste des
    -- clés étrangères vers users(id) est lue dans le catalogue, elle ne peut
    -- donc pas se désynchroniser du schéma.
    FOR v_fk IN
      SELECT c.conrelid::regclass AS table_source,
             a.attname            AS colonne
        FROM pg_constraint c
        JOIN pg_attribute  a ON a.attrelid = c.conrelid AND a.attnum = c.conkey[1]
       WHERE c.contype    = 'f'
         AND c.confrelid  = 'public.users'::regclass
         AND array_length(c.conkey, 1) = 1
    LOOP
      EXECUTE format('UPDATE %s SET %I = $1 WHERE %I = $2',
                     v_fk.table_source, v_fk.colonne, v_fk.colonne)
        USING v_ligne.nouvel_id, v_ligne.ancien_id;
    END LOOP;

    DELETE FROM public.users WHERE id = v_ligne.ancien_id;

    RAISE NOTICE 'users % : % -> %', v_ligne.email, v_ligne.ancien_id, v_ligne.nouvel_id;
  END LOOP;
END
$do$;

-- ── Contrôle ────────────────────────────────────────────────
-- Doit ne rien renvoyer : chaque compte applicatif porte l'uid de son compte
-- d'authentification. Les lignes restantes ne peuvent pas se connecter.
DO $do$
DECLARE v_restant integer;
BEGIN
  IF to_regclass('auth.users') IS NULL THEN RETURN; END IF;

  EXECUTE $q$
    SELECT count(*) FROM public.users u
      JOIN auth.users a ON lower(a.email) = lower(u.email)
     WHERE u.id <> a.id
  $q$ INTO v_restant;

  IF v_restant > 0 THEN
    RAISE WARNING '% compte(s) restent désalignés : arbitrage manuel requis.', v_restant;
  ELSE
    RAISE NOTICE 'Tous les comptes applicatifs sont alignés sur auth.users.';
  END IF;
END
$do$;
