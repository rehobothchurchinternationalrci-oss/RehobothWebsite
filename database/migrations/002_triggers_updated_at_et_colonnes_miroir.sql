-- ============================================================
-- MIGRATION 002 — Triggers updated_at et colonnes miroir
-- ============================================================
-- Met à jour updated_at automatiquement, et maintient la cohérence des
-- colonnes dupliquées departements.actif/is_active et evenements.public/est_public.
--
-- Rejouable : peut être exécutée plusieurs fois sans erreur ni doublon.
-- À exécuter dans l'éditeur SQL Supabase, dans l'ordre des numéros.
--
-- Annulation : voir 002_rollback.sql
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
