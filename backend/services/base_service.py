from typing import Dict, Any, List, Optional

class BaseService:
    """
    CRUD wrapper — délègue toutes les opérations au SupabaseRepository
    qui utilise l'API PostgREST de Supabase (clé service_role).
    """
    def __init__(self, table_name: str):
        self.table_name = table_name

    @property
    def repository(self):
        if not hasattr(self, "_repository_instance"):
            from repositories.supabase_repository import SupabaseRepository
            self._repository_instance = SupabaseRepository(self.table_name)
        return self._repository_instance

    def list(self, order_by: Optional[str] = None, limit: Optional[int] = None) -> List[Dict[str, Any]]:
        return self.repository.list(order_by, limit)

    def filter(self, filters: Dict[str, Any], order_by: Optional[str] = None, limit: Optional[int] = None) -> List[Dict[str, Any]]:
        return self.repository.filter(filters, order_by, limit)

    def get(self, id: str) -> Optional[Dict[str, Any]]:
        return self.repository.get(id)

    def create(self, data: Dict[str, Any]) -> Dict[str, Any]:
        return self.repository.create(data)

    def update(self, id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        return self.repository.update(id, data)

    def delete(self, id: str) -> bool:
        return self.repository.delete(id)
