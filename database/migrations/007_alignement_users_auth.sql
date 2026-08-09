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
-- Les triggers miroir de la migration 002 sont coupés pendant l'opération :
-- renuméroter n'est pas nommer un nouveau responsable, et les laisser réagir
-- ferait naître le doublon chef_departement que le déplacement heurterait.
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
  v_tables   regclass[];
  v_table    regclass;
  v_triggers_coupes boolean := false;
  v_ctids    tid[];
  v_ctid     tid;
BEGIN
  IF to_regclass('auth.users') IS NULL THEN
    RAISE NOTICE 'auth.users absent (base hors Supabase) : rien à faire.';
    RETURN;
  END IF;

  SELECT array_agg(DISTINCT c.conrelid::regclass)
    INTO v_tables
    FROM pg_constraint c
   WHERE c.contype   = 'f'
     AND c.confrelid = 'public.users'::regclass
     AND array_length(c.conkey, 1) = 1;

  -- Les triggers miroir (migration 002) réagissent aux écritures de références :
  -- déplacer departements.responsable_id fait naître une ligne chef_departement
  -- pour le nouvel id, que le déplacement de chef_departement heurte ensuite
  -- (contrainte UNIQUE(user_id, departement_id)). Renuméroter n'est pas un
  -- changement de responsable : on coupe la synchronisation le temps de l'opération.
  BEGIN
    FOREACH v_table IN ARRAY COALESCE(v_tables, '{}'::regclass[]) LOOP
      EXECUTE format('ALTER TABLE %s DISABLE TRIGGER USER', v_table);
    END LOOP;
    v_triggers_coupes := true;
  EXCEPTION WHEN insufficient_privilege OR wrong_object_type THEN
    -- Rôle non propriétaire des tables : les doublons créés par les triggers
    -- seront absorbés plus bas, au prix de l'historique des lignes déplacées.
    RAISE NOTICE 'Triggers non désactivables (droits insuffisants) : poursuite en mode tolérant.';
  END;

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
    -- email est un VARCHAR(255) : on tronque pour que le suffixe tienne.
    v_provisoire := left(v_ligne.email, 220) || '.migration007';
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
      -- Ligne par ligne : une table peut porter une contrainte d'unicité que le
      -- nouvel id satisfait déjà (les deux comptes désignent la même personne).
      -- La ligne du nouvel id fait alors foi, celle de l'ancien est redondante.
      EXECUTE format('SELECT array_agg(ctid) FROM %s WHERE %I = $1',
                     v_fk.table_source, v_fk.colonne)
        INTO v_ctids USING v_ligne.ancien_id;

      FOREACH v_ctid IN ARRAY COALESCE(v_ctids, '{}'::tid[]) LOOP
        BEGIN
          EXECUTE format('UPDATE %s SET %I = $1 WHERE ctid = $2',
                         v_fk.table_source, v_fk.colonne)
            USING v_ligne.nouvel_id, v_ctid;
        EXCEPTION WHEN unique_violation THEN
          EXECUTE format('DELETE FROM %s WHERE ctid = $1', v_fk.table_source)
            USING v_ctid;
          RAISE WARNING '% (%) : ligne redondante supprimée pour %, le nouvel id la portait déjà.',
            v_fk.table_source, v_fk.colonne, v_ligne.email;
        END;
      END LOOP;
    END LOOP;

    DELETE FROM public.users WHERE id = v_ligne.ancien_id;

    RAISE NOTICE 'users % : % -> %', v_ligne.email, v_ligne.ancien_id, v_ligne.nouvel_id;
  END LOOP;

  IF v_triggers_coupes THEN
    FOREACH v_table IN ARRAY COALESCE(v_tables, '{}'::regclass[]) LOOP
      EXECUTE format('ALTER TABLE %s ENABLE TRIGGER USER', v_table);
    END LOOP;
  END IF;
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

-- Les triggers miroir ayant été coupés, on vérifie que les deux faces du chef de
-- département disent toujours la même chose. Doit ne rien renvoyer.
SELECT d.nom            AS departement,
       d.responsable_id AS cote_departements,
       cd.user_id       AS cote_chef_departement
  FROM departements d
  LEFT JOIN chef_departement cd
         ON cd.departement_id = d.id AND cd.is_actif
 WHERE d.responsable_id IS DISTINCT FROM cd.user_id;
