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
| 007 | `007_alignement_users_auth.sql` | `public.users.id` réaligné sur `auth.users.id` (comptes de chefs qui ne pouvaient pas se connecter) |
| 008 | `008_suppression_module_dons.sql` | table `dons` supprimée — la fonctionnalité a été retirée du site, du dashboard et de l'API |
| 009 | `009_nettoyage_tables_inutilisees.sql` | 9 tables jamais lues ni écrites par l'application supprimées, avec leurs types ENUM orphelins |

L'ordre compte : 003 dépend de la colonne `created_at` ajoutée en 001, et 004
s'appuie sur les tables et colonnes mises en place avant.

Toutes les migrations sont **rejouables** : les relancer ne produit ni erreur
ni doublon. Sur une base créée directement avec `../rehobot.sql`, elles ne font
rien — c'est normal, le schéma est déjà à jour.

## Annulation

Chaque migration a son `00X_rollback.sql`, à exécuter dans l'ordre **inverse**.

Quatre d'entre eux ne restaurent pas les données transformées, et le disent en
en-tête : les anciens chefs de département simultanés (003), les saisies libres
de `genre` (006), les départements d'exemple supprimés (005) et les dons
enregistrés (008). Ces transformations ne sont pas réversibles : l'information
d'origine est perdue, il n'y a pas moyen de deviner laquelle était la bonne.

Le rollback de 007 ne fait rien, volontairement : revenir en arrière
consisterait à recasser la connexion des comptes qu'il vient de réparer.

## Autres scripts

- `../rehobot.sql` — DDL complet, pour créer une base neuve
- `../create_admin.sql` — premier compte administrateur (`SUPER_ADMIN`)
- `../delete_all_table.sql` — réinitialisation complète (**destructif** : supprime toutes les tables)
- `../../backend/storage_buckets.sql` — buckets Supabase Storage et politiques

## Note sur la suppression du module dons (008)

`008` supprime la table `dons`. Les instructions qui la visaient dans `001`
(index `idx_dons_date`) et `004` (politique `dons_finance_only`) ont été
retirées de ces fichiers, ainsi que du DDL `../rehobot.sql` : sans cela, la
chaîne complète jouée sur une base **neuve** échouerait à `001`, l'index
portant sur une table que le DDL ne crée plus.

Sur une base **déjà en service**, ces deux instructions ont de toute façon
déjà été exécutées ; les relancer amputées reste sans effet.

Le livre comptable `finances` est une table distincte et n'est pas concerné.

## Note sur le nettoyage des tables inutilisées (009)

Le schéma d'origine prévoit 27 tables ; l'API n'en interroge que 14. `009`
supprime celles qu'aucune ligne de code ne touche, ainsi que les six types
ENUM qui ne servaient qu'à elles.

**Recensement** — toute table atteinte par le backend passe par
`BaseService("<table>")` ou `supabase.table("<table>")`. Celles listées dans
`009` n'apparaissent dans ni l'un ni l'autre. Le module SQLAlchemy
(`backend/models/models.py`) les déclare encore, mais il est inerte au
runtime : `db.init_app()` n'est jamais appelé, l'application parle à Supabase
via PostgREST.

**Supprimées** : `annonces`, `galerie`, `medias`, `notifications`,
`rendez_vous`, `messages`, `sessions`, `inscriptions_sessions`,
`password_reset_tokens`.

**Laissées en décision, commentées dans le fichier** : `finances` (livre
comptable, seule table susceptible de contenir de vraies écritures saisies à
la main), `audit_logs` (journal, à garder si la traçabilité doit être
branchée) et `parametres_systeme` (ancien magasin clé/valeur remplacé par
`eglise_parametres`, mais encore alimenté par la migration 005).

**Conservée volontairement** : `roles`. Aucun code ne la lit, mais
`users.role` porte une clé étrangère vers `roles(id)` — la supprimer casserait
la table `users`.

**Vues** — `009` supprime d'abord `v_rdv_en_attente` (son sujet disparaît avec
`rendez_vous`) et `v_statistiques_globales`, qu'elle recrée ensuite sans ses
deux compteurs morts. Postgres refuse de supprimer une table dont une vue
dépend, cette étape n'est donc pas optionnelle. `v_membres_complets` et
`v_chef_departements` ne portent que sur des tables conservées et restent
intactes. Aucune de ces vues n'est interrogée par le code.

Contrairement à `008`, cette migration ne touche **ni `../rehobot.sql` ni les
migrations 001 à 005**, qui créent pourtant index, triggers et politiques sur
ces tables. C'est volontaire : `009` s'exécutant en dernier, une base neuve
crée ces objets puis les supprime avec leurs tables. Réécrire cinq fichiers
d'historique pour éviter quelques créations transitoires aurait coûté plus de
risque que de gain.

⚠️ **Conséquence sur la rejouabilité** : la promesse « toutes les migrations
sont rejouables » ne vaut plus pour `001`, `002` et `004` une fois `009`
passée. Elles créent index, triggers et politiques sur des tables désormais
absentes et échoueraient. L'ordre `001 → 009` sur une base neuve fonctionne,
lui, sans réserve — c'est la seule séquence à utiliser. Pour rejouer `001`,
`002` ou `004` isolément, passer d'abord `009_rollback.sql`.
