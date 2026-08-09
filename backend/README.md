# Backend — Rehoboth Church International

API Flask adossée à Supabase (PostgreSQL + Auth + Storage). Voir le [README principal](../README.md) pour l'architecture, les rôles, les variables d'environnement et l'installation complète.

## Démarrage rapide

```bash
python -m venv .venv
source .venv/bin/activate          # Windows : .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env               # renseigner SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY
python app.py                      # http://localhost:5000
```

Santé :

```bash
curl http://localhost:5000/api/health         # liveness (sans dépendance externe)
curl http://localhost:5000/api/health/ready   # readiness (config + connexion Supabase)
```

> Une config incomplète ne fait pas planter le process : l'API démarre en mode dégradé et `/api/health/ready` indique ce qui manque.

## Base de données

Le schéma complet et idempotent est dans [`../database/rehobot.sql`](../database/rehobot.sql) — à exécuter dans le SQL Editor de Supabase. Les buckets Storage et leurs politiques sont dans [`storage_buckets.sql`](storage_buckets.sql). Les évolutions d'une base existante sont dans [`../database/migrations/`](../database/migrations/README.md).

## Tests

```bash
FLASK_ENV=testing pytest
```

## Organisation

| Dossier / fichier | Rôle |
|-------------------|------|
| `app.py` | App factory, healthchecks (`/api/health`, `/api/health/ready`), `ProxyFix`, handlers d'erreurs JSON (404/429/500) |
| `extensions.py` | Client Supabase (singleton `get_supabase`) + `limiter` (flask-limiter) |
| `config/settings.py` | Chargement de la configuration (variables d'env) et `Config.validate()` |
| `routes/` | Blueprints : `auth_routes`, `crud_factory` (CRUD générique), `departement_workspace_routes`, `integrations` |
| `middlewares/` | `auth.py` (validation JWT), `rbac.py` (rôles, `department_scoped`) |
| `services/` | `BaseService` (CRUD), `DepartementService` (enrichit `responsable_nom`), `EmailService` (Resend) |
| `repositories/` | `base_repository`, `supabase_repository`, `sqlalchemy_repository` |
| `models/` | `models.py` (SQLAlchemy) et `schemas.py` (Pydantic) |
| `utils/` | `response.py` (enveloppe JSON commune), `email_templates.py` (HTML des emails) |

## Rate limiting

`flask-limiter` plafonne les routes sensibles (login, mot de passe oublié, upload, adhésion publique, envoi d'email). Stockage `memory://` par défaut (par worker gunicorn) ; renseigner `RATELIMIT_STORAGE_URI` avec une URL Redis pour un décompte partagé.

## Déploiement

Nixpacks sur Railway via `railway.toml` (build) et `Procfile` (démarrage gunicorn). Voir [DEPLOYMENT.md](../DEPLOYMENT.md).
