# Migrations SQL

Chaque migration correspond à une évolution du schéma déjà présente dans
`../rehobot.sql`. Le DDL complet reste la source de vérité pour une base
**neuve** ; ces fichiers servent à faire évoluer une base **déjà en service**
sans la recréer.

## Exécution

Dans l'éditeur SQL Supabase, **dans l'ordre des numéros** :

| # | Fichier | Contenu |
|---|---------|---------|
| 001 | `001_colonnes_contraintes_et_index.sql` | colonnes manquantes, contraintes CHECK (NOT VALID), index de clés étrangères |
| 002 | `002_triggers_updated_at_et_colonnes_miroir.sql` | triggers `updated_at`, synchro `actif`/`is_active` et `public`/`est_public`, synchro chef ↔ `responsable_id` |
| 003 | `003_un_seul_chef_actif_par_departement.sql` | `is_actif` NOT NULL, réparation des doublons, index unique partiel |
| 004 | `004_row_level_security_sur_toutes_les_tables.sql` | fonctions d'aide, RLS sur toutes les tables, politiques |
| 005 | `005_departements_officiels_et_cultes.sql` | départements réels de l'église, programme des cultes |
| 006 | `006_normalisation_genre_membres.sql` | `genre` ramené à `'M'`/`'F'` + contrainte |

L'ordre compte : 003 dépend de la colonne `created_at` ajoutée en 001, et 004
s'appuie sur les tables et colonnes mises en place avant.

Toutes les migrations sont **rejouables** : les relancer ne produit ni erreur
ni doublon. Sur une base créée directement avec `../rehobot.sql`, elles ne font
rien — c'est normal, le schéma est déjà à jour.

## Annulation

Chaque migration a son `00X_rollback.sql`, à exécuter dans l'ordre **inverse**.

Trois d'entre eux ne restaurent pas les données transformées, et le disent en
en-tête : les anciens chefs de département simultanés (003), les saisies libres
de `genre` (006) et les départements d'exemple supprimés (005). Ces
transformations ne sont pas réversibles : l'information d'origine est perdue,
il n'y a pas moyen de deviner laquelle était la bonne.

## Autres scripts

- `../rehobot.sql` — DDL complet, pour créer une base neuve
- `../create_admin.sql` — premier compte administrateur
- `../../backend/storage_buckets.sql` — buckets Supabase Storage et politiques
