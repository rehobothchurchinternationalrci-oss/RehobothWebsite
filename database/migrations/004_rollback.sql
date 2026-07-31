-- ============================================================
-- ANNULATION DE LA MIGRATION 004 — Row Level Security sur toutes les tables
-- ============================================================
-- Retire toutes les politiques et désactive le RLS : la base redevient
-- accessible directement via PostgREST avec la clé anon.
-- ============================================================

DO $do$
DECLARE r record;
BEGIN
  FOR r IN SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
  FOR r IN SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relrowsecurity LOOP
    EXECUTE format('ALTER TABLE public.%I DISABLE ROW LEVEL SECURITY', r.relname);
  END LOOP;
END
$do$;

DROP FUNCTION IF EXISTS public.app_is_dept_member(uuid);
DROP FUNCTION IF EXISTS public.app_is_chef(uuid);
DROP FUNCTION IF EXISTS public.app_membre_id();
DROP FUNCTION IF EXISTS public.app_is_authenticated();
DROP FUNCTION IF EXISTS public.app_is_media();
DROP FUNCTION IF EXISTS public.app_is_finance();
DROP FUNCTION IF EXISTS public.app_is_admin();
DROP FUNCTION IF EXISTS public.app_is_super();
DROP FUNCTION IF EXISTS public.app_role();
DROP FUNCTION IF EXISTS public.app_uid();
