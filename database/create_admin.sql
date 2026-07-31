-- ============================================================
-- REHOBOTH CHURCH INTERNATIONAL — Création du premier compte administrateur
-- ============================================================
--
-- À exécuter UNE FOIS après rehobot.sql, dans l'éditeur SQL Supabase
-- (ou via psql avec le rôle postgres).
--
-- Le script crée le compte dans les DEUX endroits, avec le MÊME identifiant :
--   1. auth.users        → c'est là que Supabase Auth vérifie le mot de passe
--                          (routes/auth_routes.py appelle sign_in_with_password)
--   2. public.users      → c'est là que l'application lit le rôle applicatif
--                          (middlewares/rbac.py → get_app_role)
--   3. public.membres    → fiche membre rattachée
--
-- L'identifiant commun est essentiel : _sync_user() cherche public.users par
-- l'id du JWT, et les politiques RLS comparent id = app_uid(). Un id différent
-- entre les deux tables = rôle retombant sur MEMBRE et accès refusés partout.
--
-- Le script est REJOUABLE : relancé, il remet à jour le mot de passe et le rôle
-- sans créer de doublon.
--
-- ⚠ CHANGEZ l'email et le mot de passe ci-dessous AVANT d'exécuter.
-- ============================================================

DO $do$
DECLARE
  -- ────────────── À PERSONNALISER ──────────────
  v_email    text := 'timotheenkwar16@gmail.com';
  v_password text := 'Rehoboth!2026';
  v_prenom   text := 'Super';
  v_nom      text := 'Admin';
  v_role     text := 'SUPER_ADMIN';   -- ou 'PASTEUR'
  -- ─────────────────────────────────────────────

  v_uid        uuid;
  v_auth_uid   uuid;
  v_public_uid uuid;
  v_hash       text;
  v_crypt_ns   text;
  v_has_auth   boolean := to_regclass('auth.users') IS NOT NULL;
  v_payload    jsonb;
  v_cols       text;
BEGIN
  v_email := lower(trim(v_email));

  IF v_password IS NULL OR length(v_password) < 8 THEN
    RAISE EXCEPTION 'Mot de passe trop court (8 caractères minimum).';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.roles WHERE id = v_role) THEN
    RAISE EXCEPTION 'Rôle % inconnu dans la table roles.', v_role;
  END IF;

  -- ── 1. Déterminer l'identifiant à utiliser ────────────────
  -- On réutilise un id existant s'il y en a un, pour que auth.users et
  -- public.users convergent au lieu de diverger.
  IF v_has_auth THEN
    EXECUTE 'SELECT id FROM auth.users WHERE lower(email) = $1'
      INTO v_auth_uid USING v_email;
  END IF;

  SELECT id INTO v_public_uid FROM public.users WHERE lower(email) = v_email;

  IF v_auth_uid IS NOT NULL AND v_public_uid IS NOT NULL
     AND v_auth_uid <> v_public_uid THEN
    RAISE EXCEPTION
      'Incohérence : % existe dans auth.users (%) et dans public.users (%) avec des id différents.',
      v_email, v_auth_uid, v_public_uid
      USING HINT = format(
        'Supprimez la ligne applicative orpheline puis relancez : DELETE FROM public.users WHERE id = %L;',
        v_public_uid);
  END IF;

  v_uid := COALESCE(v_auth_uid, v_public_uid, gen_random_uuid());

  -- ── 2. auth.users (identifiants de connexion) ─────────────
  IF v_has_auth THEN
    -- pgcrypto vit dans le schéma `extensions` sur Supabase, `public` ailleurs
    SELECT n.nspname INTO v_crypt_ns
      FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE p.proname = 'crypt' LIMIT 1;

    IF v_crypt_ns IS NULL THEN
      RAISE EXCEPTION 'Extension pgcrypto absente : exécutez rehobot.sql d''abord.';
    END IF;

    EXECUTE format('SELECT %I.crypt($1, %I.gen_salt(''bf''))', v_crypt_ns, v_crypt_ns)
      INTO v_hash USING v_password;

    IF v_auth_uid IS NULL THEN
      v_payload := jsonb_build_object(
        'instance_id',                 '00000000-0000-0000-0000-000000000000',
        'id',                          v_uid,
        'aud',                         'authenticated',
        'role',                        'authenticated',
        'email',                       v_email,
        'encrypted_password',          v_hash,
        'email_confirmed_at',          now(),
        'created_at',                  now(),
        'updated_at',                  now(),
        'raw_app_meta_data',           jsonb_build_object('provider','email','providers',jsonb_build_array('email')),
        'raw_user_meta_data',          jsonb_build_object('prenom', v_prenom, 'nom', v_nom),
        'is_super_admin',              false,
        'is_sso_user',                 false,
        'is_anonymous',                false,
        'confirmation_token',          '',
        'recovery_token',              '',
        'email_change',                '',
        'email_change_token_new',      '',
        'email_change_token_current',  '',
        'email_change_confirm_status', 0,
        'phone_change',                '',
        'phone_change_token',          '',
        'reauthentication_token',      ''
      );

      -- Liste de colonnes construite depuis le catalogue : on ne garde que
      -- celles qui existent vraiment (→ tolérant aux versions de GoTrue) et
      -- qui ne sont pas générées (`confirmed_at` l'est depuis GoTrue 2.x et
      -- refuse toute valeur explicite).
      SELECT string_agg(quote_ident(a.attname), ', ' ORDER BY a.attnum)
        INTO v_cols
        FROM pg_attribute a
       WHERE a.attrelid   = 'auth.users'::regclass
         AND a.attnum     > 0
         AND NOT a.attisdropped
         AND a.attgenerated = ''
         AND a.attname IN (SELECT k FROM jsonb_object_keys(v_payload) AS k);

      EXECUTE format(
        'INSERT INTO auth.users (%1$s) SELECT %1$s FROM jsonb_populate_record(NULL::auth.users, $1)',
        v_cols)
      USING v_payload;

      -- GoTrue exige une identité « email » pour la connexion par mot de passe
      IF to_regclass('auth.identities') IS NOT NULL THEN
        v_payload := jsonb_build_object(
          'id',              gen_random_uuid(),
          'user_id',         v_uid,
          'provider',        'email',
          'provider_id',     v_uid::text,
          'identity_data',   jsonb_build_object(
                               'sub', v_uid::text, 'email', v_email,
                               'email_verified', true, 'phone_verified', false),
          'last_sign_in_at', now(),
          'created_at',      now(),
          'updated_at',      now()
        );

        -- même précaution : auth.identities.email est une colonne générée
        SELECT string_agg(quote_ident(a.attname), ', ' ORDER BY a.attnum)
          INTO v_cols
          FROM pg_attribute a
         WHERE a.attrelid   = 'auth.identities'::regclass
           AND a.attnum     > 0
           AND NOT a.attisdropped
           AND a.attgenerated = ''
           AND a.attname IN (SELECT k FROM jsonb_object_keys(v_payload) AS k);

        EXECUTE format(
          'INSERT INTO auth.identities (%1$s) SELECT %1$s FROM jsonb_populate_record(NULL::auth.identities, $1)',
          v_cols)
        USING v_payload;
      END IF;

      RAISE NOTICE 'Compte auth.users créé (%).', v_uid;
    ELSE
      EXECUTE 'UPDATE auth.users
                  SET encrypted_password = $1,
                      email_confirmed_at = COALESCE(email_confirmed_at, now()),
                      updated_at         = now()
                WHERE id = $2'
      USING v_hash, v_uid;
      RAISE NOTICE 'Compte auth.users existant : mot de passe réinitialisé (%).', v_uid;
    END IF;
  ELSE
    RAISE NOTICE 'Schéma auth absent (PostgreSQL hors Supabase) : étape ignorée.';
  END IF;

  -- ── 3. public.users (rôle applicatif) ─────────────────────
  -- password_hash n'est pas utilisé pour la connexion (Supabase Auth s'en
  -- charge) mais la colonne est NOT NULL : on reprend la convention de
  -- _sync_user() dans auth_routes.py.
  INSERT INTO public.users (id, email, password_hash, role,
                            is_active, email_verified, must_change_password)
  VALUES (v_uid, v_email, 'supabase_managed', v_role, TRUE, TRUE, FALSE)
  ON CONFLICT (id) DO UPDATE
    SET role           = EXCLUDED.role,
        email          = EXCLUDED.email,
        is_active      = TRUE,
        email_verified = TRUE,
        updated_at     = now();

  -- ── 4. public.membres (fiche membre) ──────────────────────
  IF EXISTS (SELECT 1 FROM public.membres WHERE lower(email) = v_email) THEN
    UPDATE public.membres
       SET user_id = v_uid, prenom = v_prenom, nom = v_nom, statut = 'membre_actif'
     WHERE lower(email) = v_email;
  ELSIF NOT EXISTS (SELECT 1 FROM public.membres WHERE user_id = v_uid) THEN
    INSERT INTO public.membres (user_id, prenom, nom, email, statut, date_adhesion)
    VALUES (v_uid, v_prenom, v_nom, v_email, 'membre_actif', CURRENT_DATE);
  END IF;

  RAISE NOTICE '--------------------------------------------------';
  RAISE NOTICE 'Administrateur prêt';
  RAISE NOTICE '  id       : %', v_uid;
  RAISE NOTICE '  email    : %', v_email;
  RAISE NOTICE '  rôle     : %', v_role;
  RAISE NOTICE '  mot de passe : celui défini en haut du script';
  RAISE NOTICE 'Connectez-vous puis changez le mot de passe.';
  RAISE NOTICE '--------------------------------------------------';
END
$do$;


-- ============================================================
-- VÉRIFICATION
-- ============================================================
SELECT u.id,
       u.email,
       u.role,
       u.is_active,
       m.prenom || ' ' || m.nom AS membre,
       (to_regclass('auth.users') IS NULL)
         OR EXISTS (SELECT 1 FROM auth.users a WHERE a.id = u.id) AS compte_auth_ok
  FROM public.users u
  LEFT JOIN public.membres m ON m.user_id = u.id
 WHERE u.role IN ('SUPER_ADMIN', 'PASTEUR')
 ORDER BY u.created_at;
