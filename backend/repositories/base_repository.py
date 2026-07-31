from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional

class BaseRepository(ABC):
    @abstractmethod
    def list(self, order_by: Optional[str] = None, limit: Optional[int] = None) -> List[Dict[str, Any]]:
        pass

    @abstractmethod
    def filter(self, filters: Dict[str, Any], order_by: Optional[str] = None, limit: Optional[int] = None) -> List[Dict[str, Any]]:
        pass

    @abstractmethod
    def get(self, id: str) -> Optional[Dict[str, Any]]:
        pass

    @abstractmethod
    def create(self, data: Dict[str, Any]) -> Dict[str, Any]:
        pass

    @abstractmethod
    def update(self, id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        pass

    @abstractmethod
    def delete(self, id: str) -> bool:
        pass
