-- ============================================================
-- ROLLBACK 008 — Rétablissement de la table « dons »
-- ============================================================
-- ⚠️ Ce rollback ne restaure QUE la structure. Les dons enregistrés avant la
-- migration 008 sont perdus : ils ont été supprimés avec la table et rien ne
-- permet de les deviner. Les réimporter depuis l'export CSV réalisé avant la
-- migration, s'il a été fait.
--
-- Rétablir la table ne suffit pas à faire revenir la fonctionnalité : le code
-- correspondant a été retiré du frontend et du backend. Il faut aussi revenir
-- sur ces suppressions côté application.
--
-- Rejouable : peut être exécuté plusieurs fois sans erreur ni doublon.
-- ============================================================

CREATE TABLE IF NOT EXISTS dons (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    membre_nom TEXT,
    montant NUMERIC(10, 2) NOT NULL CHECK (montant >= 0),
    date DATE NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('dime', 'offrande', 'don_special')),
    anonyme BOOLEAN DEFAULT FALSE,
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dons_date ON dons(date);

ALTER TABLE dons ENABLE ROW LEVEL SECURITY;

-- Réservé à SUPER_ADMIN et PASTEUR, comme avant la suppression.
DROP POLICY IF EXISTS dons_finance_only ON dons;
CREATE POLICY dons_finance_only ON dons
  FOR ALL TO authenticated
  USING (public.app_is_finance()) WITH CHECK (public.app_is_finance());
