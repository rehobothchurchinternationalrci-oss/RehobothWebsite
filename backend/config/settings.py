import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    SUPABASE_URL              = os.getenv("SUPABASE_URL")
    SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    SUPABASE_KEY              = SUPABASE_SERVICE_ROLE_KEY  # alias pour le client supabase-py

    FLASK_ENV = os.getenv("FLASK_ENV", "production")
    DEBUG     = FLASK_ENV == "development"
    TESTING   = FLASK_ENV == "testing"

    @classmethod
    def validate(cls):
        missing = []
        if not cls.SUPABASE_URL:
            missing.append("SUPABASE_URL")
        if not cls.SUPABASE_SERVICE_ROLE_KEY:
            missing.append("SUPABASE_SERVICE_ROLE_KEY")
        if missing:
            raise ValueError(f"Variables d'environnement manquantes : {', '.join(missing)}")
