-- ============================================================
-- MIGRATION 005 — Départements officiels et programme des cultes
-- ============================================================
-- Remplace les départements d'exemple par la liste réelle de l'église et
-- enregistre le programme des cultes (lundi, jeudi, dimanche).
--
-- Rejouable : peut être exécutée plusieurs fois sans erreur ni doublon.
-- À exécuter dans l'éditeur SQL Supabase, dans l'ordre des numéros.
--
-- Annulation : voir 005_rollback.sql
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
