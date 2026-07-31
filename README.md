# Rehoboth Church International

Plateforme web de gestion d'église : un **site public** (accueil, événements, prédications, départements, dons, contact) et un **espace d'administration** (dashboard) pour gérer les membres, départements, présences, dons, prédications, communications et paramètres de l'église.

- **Frontend** : React 18 + Vite, Tailwind CSS, shadcn/ui (Radix), TanStack Query, Zustand, React Router
- **Backend** : API Flask (app factory + blueprints), validation Pydantic
- **Base de données & Auth** : Supabase (PostgreSQL + Supabase Auth)
- **Emails** : Resend (avec repli console en développement)

---
quand on clique sur tableau de bord , ça doit afficher un tableau de bord template avec des facke donnees similaires au tableau dans le systeme orgn et aussi avec le interactions et changenment de couleur a
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

---

## Architecture

```text
[React SPA (Vite)] ──fetch + Bearer JWT──▶ [Flask API /api/*] ──clé service_role──▶ [Supabase PostgreSQL]
        │                                        │
        │  token en localStorage                 ├──▶ Supabase Auth (validation du JWT)
        │                                        └──▶ Resend (emails transactionnels)
```

- Le frontend ne parle **jamais** directement à Supabase : tout passe par l'API Flask.
- Le backend valide chaque JWT auprès de Supabase Auth, puis résout le **rôle applicatif** depuis la table `users` pour appliquer le contrôle d'accès (RBAC).
- L'interface d'administration est en **palette neutre (shadcn)** avec **mode sombre** intégré (bascule dans la barre du haut, limité à l'admin).

## Rôles & permissions

Six rôles, appliqués **côté backend** (décorateurs `token_required` + `role_required`) et reflétés côté frontend (`ProtectedRoute`, menu filtré) :

| Rôle | Accès principal |
|------|-----------------|
| `SUPER_ADMIN` | Tout |
| `PASTEUR` | Tout |
| `SECRETAIRE` | Membres, départements, présences, dons, événements, communication |
| `CHEF_DEPARTEMENT` | Son (ses) département(s) : membres, réunions, présences, communication, rapports, ressources |
| `EQUIPE_MEDIA` | Événements, prédications |
| `MEMBRE` | Rôle par défaut à l'inscription (pas d'accès admin) |

---

## Prérequis

- **Node.js** ≥ 18 et npm
- **Python** 3.11
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
curl http://localhost:5000/api/health
# {"status": "healthy", "environment": "development"}
```

> Alternative Docker : `docker compose up` depuis `backend/`.

## Initialisation de la base de données

Le schéma complet (tables, types, index, triggers, vues, RLS) est dans **`backend/rehobot.sql`**. Il est **idempotent** : ré-exécutable sans risque, il ne (re)crée que ce qui manque.

1. Ouvrir le **SQL Editor** de votre projet Supabase.
2. Coller le contenu de `backend/rehobot.sql` et l'exécuter.

## Créer le premier administrateur

Le login passe par Supabase Auth ; tout nouvel utilisateur est créé avec le rôle `MEMBRE`. Pour obtenir un `SUPER_ADMIN` :

1. Dashboard Supabase → **Authentication → Users → Add user** (cocher *Auto Confirm User*).
2. Dans le **SQL Editor**, promouvoir ce compte :

```sql
INSERT INTO public.users (id, email, password_hash, role, is_active, email_verified)
SELECT id, email, 'supabase_managed', 'SUPER_ADMIN', true, true
FROM auth.users
WHERE email = 'votre-email@exemple.com'
ON CONFLICT (email) DO UPDATE SET role = 'SUPER_ADMIN', is_active = true;
```

Connectez-vous ensuite sur `/login` avec cet e-mail.

## Installation du frontend

```bash
cd frontend
npm install
cp .env.example .env.local        # renseigner VITE_API_BASE_URL

npm run dev                       # http://localhost:5173
```

Scripts disponibles :

| Commande | Effet |
|----------|-------|
| `npm run dev` | Serveur de développement Vite |
| `npm run build` | Build de production (`dist/`) |
| `npm run preview` | Prévisualise le build |
| `npm run lint` | ESLint |

---

## Variables d'environnement

### Backend (`backend/.env`)

| Variable | Requis | Description |
|----------|:------:|-------------|
| `SUPABASE_URL` | ✅ | URL du projet Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Clé **service_role** (secrète — jamais côté client) |
| `FLASK_ENV` | — | `development`, `production` (défaut) ou `testing` |
| `PORT` | — | Port d'écoute (défaut `5000`) |
| `RESEND_API_KEY` | — | Clé Resend ; absente → emails simulés en console |
| `RESEND_FROM_EMAIL` | — | Adresse expéditrice (défaut `onboarding@resend.dev`) |
| `CHURCH_CONTACT_EMAIL` | — | Destinataire de repli du formulaire de contact |

### Frontend (`frontend/.env.local`)

| Variable | Requis | Description |
|----------|:------:|-------------|
| `VITE_API_BASE_URL` | ✅ | URL de l'API Flask, ex. `http://localhost:5000/api` |
| `VITE_APP_VERSION` | — | Version affichée dans l'app |

> Les fichiers `.env` sont ignorés par Git. Ne jamais committer de clé.

---

## Aperçu de l'API

Base : `/api`. Toutes les écritures et les lectures sensibles exigent un `Authorization: Bearer <token>`.

| Domaine | Endpoints |
|---------|-----------|
| Santé | `GET /api/health` |
| Auth | `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/forgot-password`, `POST /api/auth/reset-password`, `POST /api/auth/upload` |
| Ressources CRUD | `/api/membres`, `/api/departements`, `/api/evenements`, `/api/presences`, `/api/dons`, `/api/predications`, `/api/eglise-parametres`, `/api/membre-departements`, `/api/communications` |
| Espace département | `/api/departements/<id>/membres`, `/reunions`, `/reunions/<rid>/presences`, `/notifications`, `/rapports`, `/documents`, `/rejoindre` (adhésion publique) |
| Intégrations | `POST /api/integrations/send-email` |

Lectures publiques (sans auth, pour le site vitrine) : `departements`, `evenements`, `predications`, `eglise-parametres`.

## Sécurité

- **RBAC côté serveur** : chaque écriture et chaque lecture de données personnelles est protégée par `token_required` + `role_required`.
- **Clé `service_role`** : utilisée uniquement par le backend ; le RLS Supabase reste actif comme défense en profondeur pour tout accès direct par la clé `anon`.
- **Anti-relais email** : un appel non authentifié à `send-email` ne peut écrire qu'à l'adresse de contact de l'église.
- **Uploads** : validation d'extension (liste blanche) et de taille (10 Mo max).
- **Mots de passe** : gérés par Supabase Auth (bcrypt) ; la réinitialisation passe par l'API admin.

---

## Structure du projet

```text
rehoboth-church-international/
├── backend/
│   ├── app.py                 # App factory Flask
│   ├── config/                # Configuration (env)
│   ├── routes/                # Blueprints : auth, CRUD factory, workspace, intégrations
│   ├── middlewares/           # auth (JWT) + rbac (rôles)
│   ├── services/              # BaseService, EmailService
│   ├── repositories/          # Accès données (Supabase)
│   ├── models/                # Modèles & schémas Pydantic
│   ├── rehobot.sql            # Schéma PostgreSQL complet (idempotent)
│   └── requirements.txt
└── frontend/
    └── src/
        ├── pages/public/      # Site vitrine
        ├── pages/dashboard/   # Espace d'administration
        ├── components/        # UI (shadcn) + layouts
        ├── services/          # httpClient, authService
        ├── api/               # apiClient (proxy CRUD)
        ├── contexts/ store/   # État d'authentification
        └── hooks/             # useDarkMode, etc.
```
