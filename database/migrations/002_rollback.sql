-- ============================================================
-- ANNULATION DE LA MIGRATION 002 — Triggers updated_at et colonnes miroir
-- ============================================================
-- Les valeurs des colonnes miroir restent en l'état ; sans les triggers elles
-- peuvent à nouveau diverger.
-- ============================================================

DROP TRIGGER IF EXISTS trg_departements_sync_actif ON departements;
DROP TRIGGER IF EXISTS trg_evenements_sync_public  ON evenements;
DROP TRIGGER IF EXISTS trg_chef_vers_departement   ON chef_departement;
DROP TRIGGER IF EXISTS trg_departement_vers_chef   ON departements;

DO $do$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['users','membres','eglise_parametres','rendez_vous',
                           'medias','departements','evenements','predications'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I', 'trg_' || t || '_updated_at', t);
  END LOOP;
END
$do$;

DROP FUNCTION IF EXISTS public.sync_departement_actif();
DROP FUNCTION IF EXISTS public.sync_evenement_public();
DROP FUNCTION IF EXISTS public.sync_chef_vers_departement();
DROP FUNCTION IF EXISTS public.sync_departement_vers_chef();
DROP FUNCTION IF EXISTS public.set_updated_at();
