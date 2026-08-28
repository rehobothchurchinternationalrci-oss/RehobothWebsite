import sys
import os
import pytest
import uuid

# Add backend directory to python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

# Doit etre pose AVANT l'import de config.settings : Config lit FLASK_ENV au
# chargement du module, et load_dotenv() n'ecrase pas une variable deja
# presente. Sans cela, /api/health annonce l'environnement du .env local.
os.environ["FLASK_ENV"] = "testing"

# Mock token_required decorator
def mock_token_required(f):
    from functools import wraps
    from flask import g
    @wraps(f)
    def decorated(*args, **kwargs):
        # `app_role` est deja renseigne : sans lui, rbac._resolve_role
        # interrogerait la vraie table users sur Supabase et la suite de tests
        # dependrait du reseau.
        g.user = {
            "id": "00000000-0000-0000-0000-000000000000",
            "email": "test@rehoboth.org",
            "role": "SUPER_ADMIN",
            "app_role": "SUPER_ADMIN",
        }
        return f(*args, **kwargs)
    return decorated

class MockSupabaseRepository:
    _db = {}

    def __init__(self, table_name):
        self.table_name = table_name
        if table_name not in self._db:
            self._db[table_name] = []

    def list(self, order_by=None, limit=None):
        data = list(self._db[self.table_name])
        if order_by:
            descending = order_by.startswith("-")
            col = order_by[1:] if descending else order_by
            data.sort(key=lambda x: str(x.get(col) or ""), reverse=descending)
        if limit:
            data = data[:limit]
        return data

    def filter(self, filters, order_by=None, limit=None):
        data = list(self._db[self.table_name])
        filtered_data = []
        for item in data:
            match = True
            for k, v in filters.items():
                if str(item.get(k)).lower() != str(v).lower():
                    match = False
                    break
            if match:
                filtered_data.append(item)
        if order_by:
            descending = order_by.startswith("-")
            col = order_by[1:] if descending else order_by
            filtered_data.sort(key=lambda x: str(x.get(col) or ""), reverse=descending)
        if limit:
            filtered_data = filtered_data[:limit]
        return filtered_data

    def get(self, id):
        for item in self._db[self.table_name]:
            if str(item.get("id")) == id:
                return item
        return None

    def create(self, data):
        item = {**data}
        if "id" not in item:
            item["id"] = str(uuid.uuid4())
        self._db[self.table_name].append(item)
        return item

    def update(self, id, data):
        for i, item in enumerate(self._db[self.table_name]):
            if str(item.get("id")) == id:
                updated_item = {**item, **data}
                self._db[self.table_name][i] = updated_item
                return updated_item
        raise ValueError(f"Record with id {id} not found")

    def delete(self, id):
        for i, item in enumerate(self._db[self.table_name]):
            if str(item.get("id")) == id:
                self._db[self.table_name].pop(i)
                return True
        return False

# Patch dependencies at module level before importing app code
import middlewares.auth
middlewares.auth.token_required = mock_token_required

import repositories.supabase_repository
repositories.supabase_repository.SupabaseRepository = MockSupabaseRepository

from app import create_app

@pytest.fixture(autouse=True)
def mock_email(monkeypatch):
    # Patch EmailService.send_email
    monkeypatch.setattr(
        "services.email_service.EmailService.send_email",
        lambda to, subject, body, html=None: True
    )

@pytest.fixture
def app():
    # Aucune base locale a creer : l'application ne parle qu'a Supabase via
    # PostgREST, et SupabaseRepository est remplace plus haut par un double en
    # memoire. L'ancienne version appelait db.create_all() sur un SQLAlchemy
    # qui n'existe plus, ce qui faisait echouer toute la suite au setup.
    return create_app({
        "TESTING": True,
        "DEBUG": False,
        "ENV": "testing",
    })

@pytest.fixture
def client(app):
    return app.test_client()
