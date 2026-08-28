from typing import Dict, Any, List, Optional
from repositories.base_repository import BaseRepository
from extensions import db
import uuid

# Helper to serialize model
def model_to_dict(model_instance) -> Optional[Dict[str, Any]]:
    if model_instance is None:
        return None
    d = {}
    for col in model_instance.__table__.columns:
        val = getattr(model_instance, col.name)
        if val.__class__.__name__ == 'UUID':
            val = str(val)
        elif val.__class__.__name__ == 'Decimal':
            val = float(val)
        elif val.__class__.__name__ in ('date', 'datetime'):
            val = val.isoformat()
        d[col.name] = val
    return d

def get_model_class(table_name: str):
    from models.models import (
        User, EgliseParametres, Membre, Departement, MembreDepartement,
        ChefDepartement, ReunionDepartement, Evenement, Presence,
        PresenceReunion, RendezVous, Annonce, Finance, Predication,
        Media, Galerie, Session, InscriptionSession, RapportDepartement,
        Communication, Message, Notification, Document, AuditLog,
        ParametresSysteme, PasswordResetToken
    )
    mapping = {
        "users": User,
        "eglise_parametres": EgliseParametres,
        "membres": Membre,
        "departements": Departement,
        "membre_departements": MembreDepartement,
        "chef_departement": ChefDepartement,
        "reunions_departement": ReunionDepartement,
        "evenements": Evenement,
        "presences": Presence,
        "presences_reunion": PresenceReunion,
        "rendez_vous": RendezVous,
        "annonces": Annonce,
        "finances": Finance,
        "predications": Predication,
        "medias": Media,
        "galerie": Galerie,
        "sessions": Session,
        "inscriptions_sessions": InscriptionSession,
        "rapports_departement": RapportDepartement,
        "communications": Communication,
        "messages": Message,
        "notifications": Notification,
        "documents": Document,
        "audit_logs": AuditLog,
        "parametres_systeme": ParametresSysteme,
        "password_reset_tokens": PasswordResetToken
    }
    return mapping.get(table_name)

class SQLAlchemyRepository(BaseRepository):
    def __init__(self, table_name: str):
        self.table_name = table_name
        self.model_class = get_model_class(table_name)
        if not self.model_class:
            raise ValueError(f"No SQLAlchemy model found for table name: {table_name}")

    def list(self, order_by: Optional[str] = None, limit: Optional[int] = None) -> List[Dict[str, Any]]:
        query = self.model_class.query
        if order_by:
            descending = order_by.startswith("-")
            col_name = order_by[1:] if descending else order_by
            col_attr = getattr(self.model_class, col_name, None)
            if col_attr:
                query = query.order_by(col_attr.desc() if descending else col_attr.asc())
        if limit:
            query = query.limit(limit)
        return [model_to_dict(item) for item in query.all()]

    def filter(self, filters: Dict[str, Any], order_by: Optional[str] = None, limit: Optional[int] = None) -> List[Dict[str, Any]]:
        query = self.model_class.query
        
        # Handle standard equality filters
        for k, v in filters.items():
            col_attr = getattr(self.model_class, k, None)
            if col_attr is not None:
                query = query.filter(col_attr == v)
                
        if order_by:
            descending = order_by.startswith("-")
            col_name = order_by[1:] if descending else order_by
            col_attr = getattr(self.model_class, col_name, None)
            if col_attr:
                query = query.order_by(col_attr.desc() if descending else col_attr.asc())
        if limit:
            query = query.limit(limit)
        return [model_to_dict(item) for item in query.all()]

    def get(self, id: str) -> Optional[Dict[str, Any]]:
        try:
            uuid_id = uuid.UUID(id)
            item = self.model_class.query.get(uuid_id)
        except (ValueError, AttributeError):
            item = self.model_class.query.get(id)
        return model_to_dict(item)

    def create(self, data: Dict[str, Any]) -> Dict[str, Any]:
        processed_data = {}
        for k, v in data.items():
            col_attr = getattr(self.model_class, k, None)
            if col_attr is not None and hasattr(col_attr, "type") and col_attr.type.__class__.__name__ == 'UUID' and isinstance(v, str):
                try:
                    processed_data[k] = uuid.UUID(v)
                except ValueError:
                    processed_data[k] = v
            else:
                processed_data[k] = v
        
        item = self.model_class(**processed_data)
        db.session.add(item)
        db.session.commit()
        return model_to_dict(item)

    def update(self, id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        try:
            uuid_id = uuid.UUID(id)
            item = self.model_class.query.get(uuid_id)
        except (ValueError, AttributeError):
            item = self.model_class.query.get(id)
            
        if not item:
            raise ValueError(f"Record with id {id} not found")
            
        for k, v in data.items():
            col_attr = getattr(self.model_class, k, None)
            if col_attr is not None and hasattr(col_attr, "type") and col_attr.type.__class__.__name__ == 'UUID' and isinstance(v, str):
                try:
                    setattr(item, k, uuid.UUID(v))
                except ValueError:
                    setattr(item, k, v)
            else:
                setattr(item, k, v)
                
        db.session.commit()
        return model_to_dict(item)

    def delete(self, id: str) -> bool:
        try:
            uuid_id = uuid.UUID(id)
            item = self.model_class.query.get(uuid_id)
        except (ValueError, AttributeError):
            item = self.model_class.query.get(id)
            
        if not item:
            return False
            
        db.session.delete(item)
        db.session.commit()
        return True
