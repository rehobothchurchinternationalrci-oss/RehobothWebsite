-- ============================================================
-- MIGRATION 004 — Row Level Security sur toutes les tables
-- ============================================================
-- Fonctions d'aide SECURITY DEFINER, activation du RLS sur toutes les tables du
-- schéma public, et politiques par table. Le backend utilise la clé service_role
-- (BYPASSRLS) : l'API n'est pas affectée par ces règles.
--
-- Rejouable : peut être exécutée plusieurs fois sans erreur ni doublon.
-- À exécuter dans l'éditeur SQL Supabase, dans l'ordre des numéros.
--
-- Annulation : voir 004_rollback.sql
-- ============================================================

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
