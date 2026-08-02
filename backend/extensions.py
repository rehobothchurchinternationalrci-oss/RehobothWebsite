from typing import Optional
from supabase import create_client, Client

_client: Optional[Client] = None

def get_supabase() -> Client:
    global _client
    if _client is None:
        from config.settings import Config
        _client = create_client(Config.SUPABASE_URL, Config.SUPABASE_SERVICE_ROLE_KEY)
    return _client


# ── Rate limiting ─────────────────────────────────────────────────────────────
# Défini ici pour être importable par les blueprints sans dépendre de app.py
# (l'initialisation réelle se fait dans create_app via limiter.init_app).
#
# Stockage en mémoire par défaut : le compteur est propre à chaque worker
# gunicorn et repart à zéro au redéploiement. C'est suffisant pour freiner le
# bruteforce et le spam ; pour un décompte exact et partagé, renseigner
# RATELIMIT_STORAGE_URI avec un Redis.
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

limiter = Limiter(
    key_func=get_remote_address,
    default_limits=[],          # pas de plafond global : on cible les routes sensibles
    storage_uri="memory://",
    strategy="fixed-window",
)
