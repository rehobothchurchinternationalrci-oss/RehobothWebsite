# Rehoboth Church International

Plateforme web de gestion d'église : un **site public** (accueil, événements, prédications, départements, dons, contact) et un **espace d'administration** (dashboard) pour gérer les membres, départements, présences, dons, prédications, communications et paramètres de l'église.

- **Frontend** : React 18 + Vite, Tailwind CSS, shadcn/ui (Radix), TanStack Query, Zustand, React Router
- **Backend** : API Flask (app factory + blueprints), validation Pydantic, rate limiting (flask-limiter)
- **Base de données & Auth** : Supabase (PostgreSQL + Supabase Auth + Storage)
- **Emails** : Resend (avec repli console en développement)

---

## Sommaire

- [Architecture](#architecture)
- [Rôles & permissions](#rôles--permissions)
- [Prérequis](#prérequis)
- [Installation du backend](#installation-du-backend)
- [Initialisation de la base de données](#initialisation-de-la-base-de-données)
- [Créer le premier administrateur](#créer-le-premier-administrateur)
- [Installation du frontend](#installation-du-frontend)
- [Variables d'environnement](#variables-denvironnement)
- [Aperçu de l'API](#aperçu-de-lapi)
- [Sécurité](#sécurité)
- [Structure du projet](#structure-du-projet)
- [Déploiement](#déploiement)

---

## Architecture

```text
[React SPA (Vite)] ──fetch + Bearer JWT──▶ [Flask API /api/*] ──clé service_role──▶ [Supabase PostgreSQL]
        │                                        │
        │  tokens dans localStorage              ├──▶ Supabase Auth (validation du JWT)
        │                                        ├──▶ Supabase Storage (uploads)
        │                                        └──▶ Resend (emails transactionnels)
```

- Le frontend ne parle **jamais** directement à Supabase : tout passe par l'API Flask.
- Le backend valide chaque JWT auprès de Supabase Auth, puis résout le **rôle applicatif** depuis la table `users` pour appliquer le contrôle d'accès (RBAC).
- Derrière le proxy Railway, `ProxyFix` restitue l'IP réelle du visiteur pour que le rate limiting compte par client et non globalement.
- L'interface d'administration est en **palette neutre (shadcn)** avec **mode sombre** intégré (bascule dans la barre du haut, limité à l'admin).

## Rôles & permissions

Six rôles, appliqués **côté backend** (décorateurs `token_required` + `role_required`, et `department_scoped` pour l'espace de travail) et reflétés côté frontend (`ProtectedRoute`, menu filtré) :

| Rôle | Accès principal |
|------|-----------------|
| `SUPER_ADMIN` | Tout |
| `PASTEUR` | Tout |
| `SECRETAIRE` | Membres, départements, présences, dons, événements, communication |
| `CHEF_DEPARTEMENT` | **Uniquement le(s) département(s) qu'il dirige** : membres, réunions, présences, communication, rapports, ressources |
| `EQUIPE_MEDIA` | Événements, prédications |
| `MEMBRE` | Rôle par défaut à l'inscription (pas d'accès admin) |

> `CHEF_DEPARTEMENT` est cloisonné par `department_scoped` : un chef ne peut lire ni écrire les données d'un département qu'il ne dirige pas (répliqué côté SQL par la fonction `app_is_chef` + RLS).

---

## Prérequis

- **Node.js** ≥ 18 et npm
- **Python** 3.11 (voir `backend/.python-version`)
- Un projet **Supabase** (URL + clés API)
- (Optionnel) Un compte **Resend** pour l'envoi réel d'emails

## Installation du backend

```bash
cd backend

# Environnement virtuel + dépendances
python -m venv .venv
source .venv/bin/activate        # Windows : .venv\Scripts\activate
pip install -r requirements.txt

# Configuration
cp .env.example .env             # puis renseigner les valeurs (voir plus bas)

# Lancer l'API (par défaut sur http://localhost:5000)
python app.py
```

Vérifier que l'API répond :

```bash
# Liveness (sans dépendance externe)
curl http://localhost:5000/api/health
# {"status": "healthy", "environment": "development"}

# Readiness (vérifie la config + la connexion Supabase)
curl http://localhost:5000/api/health/ready
```

> Si `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` manquent, l'API démarre en **mode dégradé** (elle ne crashe pas) et `/api/health/ready` indique précisément ce qui manque.

## Initialisation de la base de données

Le schéma complet (tables, types, index, triggers, vues, RLS) est dans **`database/rehobot.sql`**. Il est **idempotent** : ré-exécutable sans risque, il ne (re)crée que ce qui manque.

1. Ouvrir le **SQL Editor** de votre projet Supabase.
2. Coller le contenu de `database/rehobot.sql` et l'exécuter.
3. Exécuter `backend/storage_buckets.sql` pour créer les buckets Supabase Storage (logos, photos, événements, galerie, médias, documents) et leurs politiques.

Sur une base **déjà en service**, les évolutions incrémentales se trouvent dans `database/migrations/` — voir son [README](database/migrations/README.md).

## Créer le premier administrateur

Le login passe par Supabase Auth ; tout nouvel utilisateur est créé avec le rôle `MEMBRE`. Pour obtenir un `SUPER_ADMIN`, utiliser le script fourni **`database/create_admin.sql`** :

1. Ouvrir `database/create_admin.sql` dans le **SQL Editor** de Supabase.
2. Renseigner l'email et le mot de passe (placeholders volontairement invalides — le script s'arrête sinon).
3. Exécuter. Le script crée le compte de façon cohérente dans `auth.users`, `public.users` (rôle `SUPER_ADMIN`) et `public.membres`, avec le **même identifiant** partout. Il est rejouable.

> Générer un mot de passe solide : `python -c "import secrets; print(secrets.token_urlsafe(24))"`.
> Ne jamais réenregistrer le fichier avec de vrais identifiants.

Connectez-vous ensuite sur `/login` avec cet e-mail.

## Installation du frontend

```bash
cd frontend
npm install
cp .env.example .env               # renseigner VITE_API_BASE_URL

npm run dev                        # http://localhost:5173
```

Scripts disponibles :

| Commande | Effet |
|----------|-------|
| `npm run dev` | Serveur de développement Vite |
| `npm run build` | Build de production (`dist/`) |
| `npm run preview` | Prévisualise le build |
| `npm run lint` | ESLint |
| `npm run lint:fix` | ESLint avec correction automatique |

---

## Variables d'environnement

### Backend (`backend/.env`)

| Variable | Requis | Description |
|----------|:------:|-------------|
| `SUPABASE_URL` | ✅ | URL du projet Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Clé **service_role** (secrète — jamais côté client) |
| `FLASK_ENV` | — | `development`, `production` (défaut) ou `testing` |
| `PORT` | — | Port d'écoute local (défaut `5000`) ; injecté par Railway en prod |
| `FRONTEND_URL` | — | URL publique du site, sans slash final. Sert à construire les liens des emails (réinitialisation, onboarding des chefs). Défaut `http://localhost:5173` |
| `CORS_ORIGINS` | — | Origines autorisées, séparées par des virgules. `*` (défaut) autorise tout — à restreindre en production |
| `RATELIMIT_STORAGE_URI` | — | Stockage des compteurs de rate limiting. `memory://` (défaut) ; renseigner une URL Redis pour un décompte partagé entre workers |
| `RESEND_API_KEY` | — | Clé Resend ; absente → emails simulés en console |
| `RESEND_FROM_EMAIL` | — | Adresse expéditrice (défaut `onboarding@resend.dev`) |
| `CHURCH_CONTACT_EMAIL` | — | Destinataire de repli du formulaire de contact |
| `GUNICORN_WORKERS` / `GUNICORN_THREADS` / `GUNICORN_TIMEOUT` | — | Réglages Gunicorn en production (défauts `2` / `4` / `120`) |

### Frontend (`frontend/.env`)

| Variable | Requis | Description |
|----------|:------:|-------------|
| `VITE_API_BASE_URL` | ✅ | URL de l'API Flask, ex. `http://localhost:5000/api` |
| `VITE_APP_VERSION` | — | Version affichée dans l'app |

> Les fichiers `.env` sont ignorés par Git. Ne jamais committer de clé.
> ⚠️ Vite fige les variables `VITE_*` **au build** : toute modification impose un rebuild.

---

## Aperçu de l'API

Base : `/api`. Toutes les écritures et les lectures sensibles exigent un `Authorization: Bearer <token>`.

| Domaine | Endpoints |
|---------|-----------|
| Santé | `GET /api/health` (liveness), `GET /api/health/ready` (readiness : config + Supabase) |
| Auth | `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/forgot-password`, `POST /api/auth/reset-password`, `POST /api/auth/upload`, `POST /api/auth/file-url` |
| Ressources CRUD | `/api/membres`, `/api/departements`, `/api/evenements`, `/api/presences`, `/api/dons`, `/api/predications`, `/api/eglise-parametres`, `/api/membre-departements`, `/api/communications` |
| Espace département | `/api/departements/<id>` (POST/PUT dédiés, création du chef), `/<id>/chef`, `/<id>/membres`, `/reunions`, `/reunions/<rid>/presences`, `/notifications`, `/rapports`, `/documents`, `/rejoindre` (adhésion publique) |
| Intégrations | `POST /api/integrations/send-email` |

Lectures publiques (sans auth, pour le site vitrine) : `departements`, `evenements`, `predications`, `eglise-parametres`.

Routes soumises au **rate limiting** : `login` (10/min, 50/h), `forgot-password` (5/h), `upload` (30/h), `rejoindre` (5/h, 20/jour), `send-email` (3/h, 10/jour — exempté pour l'encadrement authentifié).

## Sécurité

- **RBAC côté serveur** : chaque écriture et chaque lecture de données personnelles est protégée par `token_required` + `role_required` ; l'espace de travail des départements est cloisonné par `department_scoped`.
- **Clé `service_role`** : utilisée uniquement par le backend ; le RLS Supabase reste actif comme défense en profondeur pour tout accès direct par la clé `anon`.
- **Rate limiting** : les routes sensibles et publiques sont plafonnées (voir tableau ci-dessus) pour freiner bruteforce et spam.
- **Anti-relais email** : un appel non authentifié à `send-email` ne peut écrire qu'à l'adresse de contact de l'église ; sujet/corps sont bornés en taille.
- **Uploads** : buckets typés (validation d'extension et de taille par bucket, jusqu'à 200 Mo pour les médias) ; les buckets privés servent des **URLs signées** régénérables via `/api/auth/file-url`.
- **Mots de passe** : gérés par Supabase Auth (bcrypt) ; les comptes de chefs reçoivent un mot de passe imprévisible (`secrets.token_urlsafe`) et `must_change_password` force son remplacement.
- **Démarrage robuste** : une config incomplète ne tue pas le process (mode dégradé) ; `/api/health/ready` en fait le diagnostic.

---

## Structure du projet

```text
rehoboth-church-international/
├── backend/
│   ├── app.py                     # App factory Flask + healthchecks + handlers d'erreurs
│   ├── extensions.py              # Client Supabase (singleton) + limiter (flask-limiter)
│   ├── config/settings.py         # Configuration (variables d'env)
│   ├── routes/                    # Blueprints : auth, crud_factory, departement_workspace, integrations
│   ├── middlewares/               # auth.py (JWT) + rbac.py (rôles, department_scoped)
│   ├── services/                  # BaseService, DepartementService, EmailService
│   ├── repositories/              # base / supabase / sqlalchemy
│   ├── models/                    # models.py + schemas.py (Pydantic)
│   ├── utils/                     # response.py (enveloppe JSON), email_templates.py
│   ├── storage_buckets.sql        # Buckets Supabase Storage + politiques
│   ├── Procfile + railway.toml    # Déploiement Nixpacks (gunicorn)
│   └── requirements.txt
├── database/
│   ├── rehobot.sql                # Schéma PostgreSQL complet (idempotent)
│   ├── create_admin.sql           # Premier compte administrateur
│   ├── delete_all_table.sql       # Réinitialisation (destructif)
│   └── migrations/                # Évolutions incrémentales 001 → 007 (+ rollbacks)
└── frontend/
    ├── Dockerfile + nginx.conf.template   # Build Vite + service statique (Railway)
    └── src/
        ├── pages/public/          # Site vitrine
        ├── pages/dashboard/       # Espace d'administration
        ├── components/            # UI (shadcn) + layouts
        ├── services/              # api/, auth/ (httpClient, authService)
        ├── api/apiClient.js       # Proxy CRUD
        ├── config/endpoints.js    # Table des endpoints
        ├── contexts/ store/       # État d'authentification (AuthContext, authStore)
        └── hooks/                 # useDarkMode, use-mobile, etc.
```

## Déploiement

Le dépôt se déploie en **deux services Railway** (backend en Nixpacks, frontend en Docker + nginx), avec Supabase pour la base et le stockage. Voir le guide complet : [DEPLOYMENT.md](DEPLOYMENT.md).
