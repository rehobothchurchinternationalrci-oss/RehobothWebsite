-- ============================================================
-- ANNULATION DE LA MIGRATION 007 — Alignement public.users / auth.users
-- ============================================================
-- Rien à annuler : la migration ne touche ni au schéma ni aux données métier,
-- elle se contente de renuméroter des comptes avec l'identifiant que le login
-- attend. Revenir en arrière consisterait à remettre des identifiants
-- aléatoires — c'est-à-dire à recasser la connexion des chefs de département,
-- et les anciens id ne sont de toute façon plus connus.
-- ============================================================

DO $do$
BEGIN
  RAISE NOTICE 'Migration 007 : aucune annulation possible ni nécessaire.';
END
$do$;
