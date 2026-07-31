-- ============================================================
-- REHOBOTH CHURCH INTERNATIONAL — Buckets Supabase Storage
-- ============================================================
--
-- À exécuter APRÈS rehobot.sql (les politiques réutilisent les fonctions
-- app_is_admin() / app_is_media() / app_is_finance() définies là-bas).
--
-- Six buckets, un par usage, alignés sur les colonnes du schéma :
--
--   logos           → eglise_parametres.logo_url
--   photos-membres  → membres.photo_url
--   evenements      → evenements.image_url, annonces.image_url
--   galerie         → galerie.fichier_url
--   medias          → medias.fichier_url / thumbnail_url, predications.fichier_url
--   documents       → documents.fichier_url            (PRIVÉ)
--
-- Les cinq premiers sont publics en lecture : le frontend affiche les URL
-- directement dans des <img> / <video>, ce qui exclut les URL signées.
-- L'écriture, elle, reste réservée aux rôles applicatifs concernés.
--
-- `documents` est privé : ces fichiers passent par des URL signées
-- (createSignedUrl), voir la note en fin de fichier.
--
-- Script REJOUABLE : relancé, il met à jour les limites sans rien casser.
-- ============================================================

DO $do$
DECLARE
  v_10mo  bigint := 10  * 1024 * 1024;
  v_25mo  bigint := 25  * 1024 * 1024;
  v_200mo bigint := 200 * 1024 * 1024;

  v_images text[] := ARRAY['image/jpeg','image/png','image/gif','image/webp'];
  v_docs   text[] := ARRAY[
    'application/pdf', 'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'];
  v_medias text[] := ARRAY['audio/mpeg','video/mp4','image/jpeg','image/png','image/webp'];

  b record;
BEGIN
  IF to_regclass('storage.buckets') IS NULL THEN
    RAISE NOTICE 'Schéma storage absent (PostgreSQL hors Supabase) : script ignoré.';
    RETURN;
  END IF;

  FOR b IN
    SELECT * FROM (VALUES
      ('logos',          TRUE,  v_10mo,  v_images),
      ('photos-membres', TRUE,  v_10mo,  v_images),
      ('evenements',     TRUE,  v_10mo,  v_images),
      ('galerie',        TRUE,  v_25mo,  v_images || ARRAY['video/mp4']),
      ('medias',         TRUE,  v_200mo, v_medias),
      ('documents',      FALSE, v_25mo,  v_docs || v_images)
    ) AS t(id, public, taille_max, mimes)
  LOOP
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (b.id, b.id, b.public, b.taille_max, b.mimes)
    ON CONFLICT (id) DO UPDATE
      SET public             = EXCLUDED.public,
          file_size_limit    = EXCLUDED.file_size_limit,
          allowed_mime_types = EXCLUDED.allowed_mime_types;

    RAISE NOTICE 'Bucket % (% , % Mo)', b.id,
                 CASE WHEN b.public THEN 'public' ELSE 'privé' END,
                 b.taille_max / 1024 / 1024;
  END LOOP;
END
$do$;


-- ============================================================
-- POLITIQUES D'ACCÈS (RLS sur storage.objects)
-- ============================================================
-- Supabase active déjà le RLS sur storage.objects. Sans politique, seul le
-- backend (service_role, BYPASSRLS) peut écrire — ce qui est déjà sûr. Les
-- politiques ci-dessous ouvrent en plus l'accès direct depuis le navigateur.

DO $do$
DECLARE
  p record;
BEGIN
  IF to_regclass('storage.objects') IS NULL THEN
    RAISE NOTICE 'storage.objects absent : politiques ignorées.';
    RETURN;
  END IF;

  -- Repartir propre : ce fichier est la source de vérité de ces politiques.
  FOR p IN
    SELECT policyname FROM pg_policies
     WHERE schemaname = 'storage' AND tablename = 'objects'
       AND policyname LIKE 'rehoboth_%'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', p.policyname);
  END LOOP;

  -- ── Lecture publique des cinq buckets publics ─────────────
  EXECUTE $sql$
    CREATE POLICY rehoboth_lecture_publique ON storage.objects
      FOR SELECT TO anon, authenticated
      USING (bucket_id IN ('logos','photos-membres','evenements','galerie','medias'))
  $sql$;

  -- ── logos : paramétrage de l'église (SUPER_ADMIN, PASTEUR) ──
  EXECUTE $sql$
    CREATE POLICY rehoboth_logos_ecriture ON storage.objects
      FOR ALL TO authenticated
      USING      (bucket_id = 'logos' AND public.app_is_finance())
      WITH CHECK (bucket_id = 'logos' AND public.app_is_finance())
  $sql$;

  -- ── photos-membres : chacun dépose la sienne, l'admin gère tout ──
  -- storage.objects.owner porte l'uid de celui qui a téléversé.
  EXECUTE $sql$
    CREATE POLICY rehoboth_photos_depot ON storage.objects
      FOR INSERT TO authenticated
      WITH CHECK (bucket_id = 'photos-membres')
  $sql$;
  EXECUTE $sql$
    CREATE POLICY rehoboth_photos_gestion ON storage.objects
      FOR UPDATE TO authenticated
      USING      (bucket_id = 'photos-membres'
                  AND (owner = (SELECT public.app_uid()) OR public.app_is_admin()))
      WITH CHECK (bucket_id = 'photos-membres'
                  AND (owner = (SELECT public.app_uid()) OR public.app_is_admin()))
  $sql$;
  EXECUTE $sql$
    CREATE POLICY rehoboth_photos_suppression ON storage.objects
      FOR DELETE TO authenticated
      USING (bucket_id = 'photos-membres'
             AND (owner = (SELECT public.app_uid()) OR public.app_is_admin()))
  $sql$;

  -- ── evenements : mêmes rôles que la table evenements/annonces ──
  EXECUTE $sql$
    CREATE POLICY rehoboth_evenements_ecriture ON storage.objects
      FOR ALL TO authenticated
      USING      (bucket_id = 'evenements'
                  AND (public.app_is_admin() OR public.app_is_media()))
      WITH CHECK (bucket_id = 'evenements'
                  AND (public.app_is_admin() OR public.app_is_media()))
  $sql$;

  -- ── galerie et medias : équipe média ──────────────────────
  EXECUTE $sql$
    CREATE POLICY rehoboth_media_ecriture ON storage.objects
      FOR ALL TO authenticated
      USING      (bucket_id IN ('galerie','medias') AND public.app_is_media())
      WITH CHECK (bucket_id IN ('galerie','medias') AND public.app_is_media())
  $sql$;

  -- ── documents : bucket privé ──────────────────────────────
  -- Lecture directe réservée aux admins et aux chefs : le chemin d'un fichier
  -- ne permet pas de retrouver son département, donc impossible de rejouer
  -- ici le filtrage de la table `documents`. Pour les autres membres, le
  -- backend (service_role) applique les règles de la table puis délivre une
  -- URL signée — le fichier reste ainsi aussi protégé que sa fiche.
  EXECUTE $sql$
    CREATE POLICY rehoboth_documents_lecture ON storage.objects
      FOR SELECT TO authenticated
      USING (bucket_id = 'documents'
             AND (public.app_is_admin()
                  OR public.app_role() = 'CHEF_DEPARTEMENT'))
  $sql$;
  EXECUTE $sql$
    CREATE POLICY rehoboth_documents_ecriture ON storage.objects
      FOR ALL TO authenticated
      USING      (bucket_id = 'documents'
                  AND (public.app_is_admin()
                       OR public.app_role() = 'CHEF_DEPARTEMENT'))
      WITH CHECK (bucket_id = 'documents'
                  AND (public.app_is_admin()
                       OR public.app_role() = 'CHEF_DEPARTEMENT'))
  $sql$;

  RAISE NOTICE 'Politiques storage.objects créées.';
EXCEPTION WHEN insufficient_privilege THEN
  RAISE WARNING 'Privilèges insuffisants sur storage.objects : créez les politiques '
                'depuis Dashboard → Storage → Policies. Les buckets, eux, sont créés.';
END
$do$;


-- ============================================================
-- VÉRIFICATION
-- ============================================================
SELECT b.id                                   AS bucket,
       CASE WHEN b.public THEN 'public' ELSE 'privé' END AS acces,
       b.file_size_limit / 1024 / 1024        AS taille_max_mo,
       array_length(b.allowed_mime_types, 1)  AS nb_types,
       (SELECT count(*) FROM storage.objects o WHERE o.bucket_id = b.id) AS fichiers
  FROM storage.buckets b
 WHERE b.id IN ('logos','photos-membres','evenements','galerie','medias','documents')
 ORDER BY b.id;


-- ============================================================
-- CÔTÉ APPLICATION — ce qu'il reste à brancher
-- ============================================================
-- L'endpoint /auth/upload (routes/auth_routes.py) écrit encore sur le disque
-- local (static/uploads), qui est effacé à chaque redéploiement. Pour utiliser
-- ces buckets, remplacer file.save(...) par :
--
--   bucket = "photos-membres"            # choisi selon l'usage appelant
--   path   = f"{uuid.uuid4().hex}/{filename}"
--   get_supabase().storage.from_(bucket).upload(
--       path, file.read(), {"content-type": file.mimetype, "upsert": "false"})
--   file_url = get_supabase().storage.from_(bucket).get_public_url(path)
--
-- Pour `documents` (bucket privé), remplacer la dernière ligne par :
--   file_url = get_supabase().storage.from_("documents") \
--                  .create_signed_url(path, 3600)["signedURL"]
--
-- Rappel : MAX_UPLOAD_BYTES vaut 10 Mo dans auth_routes.py — c'est cette
-- limite qui s'applique en premier, avant celles des buckets.
