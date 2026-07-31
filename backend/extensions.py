from typing import Optional
from supabase import create_client, Client

_client: Optional[Client] = None

def get_supabase() -> Client:
    global _client
    if _client is None:
        from config.settings import Config
        _client = create_client(Config.SUPABASE_URL, Config.SUPABASE_SERVICE_ROLE_KEY)
    return _client
