# Backend — Rehoboth Church International

API Flask adossée à Supabase (PostgreSQL + Auth). Voir le [README principal](../README.md) pour l'architecture, les rôles et l'installation complète.

## Démarrage rapide

```bash
python -m venv .venv
source .venv/bin/activate          # Windows : .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env               # renseigner SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY
python app.py                      # http://localhost:5000
```

Santé : `curl http://localhost:5000/api/health`

## Base de données

Le schéma complet et idempotent est dans [`rehobot.sql`](rehobot.sql) — à exécuter dans le SQL Editor de Supabase.

## Tests

```bash
FLASK_ENV=testing pytest
```

## Organisation

| Dossier | Rôle |
|---------|------|
| `routes/` | Blueprints : `auth_routes`, `crud_factory`, `departement_workspace_routes`, `integrations` |
| `middlewares/` | `auth.py` (validation JWT), `rbac.py` (rôles) |
| `services/` | `BaseService` (CRUD), `EmailService` (Resend) |
| `repositories/` | Accès données via l'API Supabase |
| `models/` | Modèles SQLAlchemy et schémas Pydantic |
| `config/` | Chargement de la configuration (variables d'env) |
