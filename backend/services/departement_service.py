from typing import Any, Dict, Iterable, List, Optional

from services.base_service import BaseService


class DepartementService(BaseService):
    """
    `departements`, enrichi du nom du responsable.

    `responsable_nom` n'est pas une colonne : la table ne stocke que
    `responsable_id`, qui pointe sur `users`. Sans cet enrichissement, tous les
    écrans qui affichent le chef (site vitrine, cartes du tableau de bord,
    en-tête de l'espace de travail) affichaient « Non assigné » même sur un
    département pourvu d'un responsable.
    """

    def __init__(self):
        super().__init__("departements")

    @staticmethod
    def _noms_par_user_id(user_ids: Iterable[Optional[str]]) -> Dict[str, str]:
        """Une seule requête pour toute la liste, pas une par département."""
        ids = sorted({uid for uid in user_ids if uid})
        if not ids:
            return {}

        from extensions import get_supabase

        res = get_supabase().table("membres") \
            .select("user_id, prenom, nom").in_("user_id", ids).execute()

        return {
            m["user_id"]: f"{m.get('prenom') or ''} {m.get('nom') or ''}".strip()
            for m in (res.data or [])
        }

    def _enrichir(self, records: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        noms = self._noms_par_user_id(r.get("responsable_id") for r in records)
        for r in records:
            r["responsable_nom"] = noms.get(r.get("responsable_id"), "")
        return records

    def list(self, order_by: Optional[str] = None, limit: Optional[int] = None) -> List[Dict[str, Any]]:
        return self._enrichir(super().list(order_by, limit) or [])

    def filter(self, filters: Dict[str, Any], order_by: Optional[str] = None,
               limit: Optional[int] = None) -> List[Dict[str, Any]]:
        return self._enrichir(super().filter(filters, order_by, limit) or [])

    def get(self, id: str) -> Optional[Dict[str, Any]]:
        record = super().get(id)
        if not record:
            return record
        return self._enrichir([record])[0]
