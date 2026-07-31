from typing import Dict, Any, List, Optional
from repositories.base_repository import BaseRepository
from config.settings import Config
from supabase import create_client, Client

_supabase_client: Optional[Client] = None

def get_supabase_client() -> Client:
    global _supabase_client
    if _supabase_client is None:
        Config.validate()
        _supabase_client = create_client(Config.SUPABASE_URL, Config.SUPABASE_KEY)
    return _supabase_client

class SupabaseRepository(BaseRepository):
    def __init__(self, table_name: str):
        self.table_name = table_name

    @property
    def client(self) -> Client:
        if not hasattr(self, "_client_instance"):
            self._client_instance = get_supabase_client()
        return self._client_instance

    def list(self, order_by: Optional[str] = None, limit: Optional[int] = None) -> List[Dict[str, Any]]:
        query = self.client.table(self.table_name).select("*")
        if order_by:
            descending = order_by.startswith("-")
            col = order_by[1:] if descending else order_by
            query = query.order(col, desc=descending)
        if limit:
            query = query.limit(limit)
        
        res = query.execute()
        return res.data

    def filter(self, filters: Dict[str, Any], order_by: Optional[str] = None, limit: Optional[int] = None) -> List[Dict[str, Any]]:
        query = self.client.table(self.table_name).select("*")
        for k, v in filters.items():
            query = query.eq(k, v)
        if order_by:
            descending = order_by.startswith("-")
            col = order_by[1:] if descending else order_by
            query = query.order(col, desc=descending)
        if limit:
            query = query.limit(limit)

        res = query.execute()
        return res.data

    def get(self, id: str) -> Optional[Dict[str, Any]]:
        res = self.client.table(self.table_name).select("*").eq("id", id).execute()
        return res.data[0] if res.data else None

    def create(self, data: Dict[str, Any]) -> Dict[str, Any]:
        res = self.client.table(self.table_name).insert(data).execute()
        return res.data[0]

    def update(self, id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        res = self.client.table(self.table_name).update(data).eq("id", id).execute()
        if not res.data:
            raise ValueError(f"Record with id {id} not found")
        return res.data[0]

    def delete(self, id: str) -> bool:
        res = self.client.table(self.table_name).delete().eq("id", id).execute()
        return len(res.data) > 0
