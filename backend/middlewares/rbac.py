from functools import wraps
from flask import g
from utils.response import error_response

# Groupes de rôles applicatifs — alignés sur les matrices du frontend (App.jsx)
ADMIN_ROLES    = ("SUPER_ADMIN", "PASTEUR", "SECRETAIRE")
DEPT_ROLES     = ADMIN_ROLES + ("CHEF_DEPARTEMENT",)
EVENT_ROLES    = ADMIN_ROLES + ("EQUIPE_MEDIA", "CHEF_DEPARTEMENT")
MEDIA_ROLES    = ("SUPER_ADMIN", "PASTEUR", "EQUIPE_MEDIA")
SETTINGS_ROLES = ("SUPER_ADMIN", "PASTEUR")


def get_app_role(user_id: str, email: str = None) -> str:
    """
    Résout le rôle applicatif depuis la table users (le JWT Supabase
    ne porte que le rôle générique 'authenticated').
    """
    from extensions import get_supabase
    supabase = get_supabase()

    res = supabase.table("users").select("role").eq("id", user_id).execute()
    if not res.data and email:
        res = supabase.table("users").select("role").eq("email", email).execute()

    return res.data[0].get("role", "MEMBRE") if res.data else "MEMBRE"


def role_required(*allowed_roles):
    """
    Restreint l'accès aux rôles applicatifs donnés.
    Doit être appliqué APRÈS token_required (g.user doit exister).
    """
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            if not getattr(g, "user", None):
                return error_response("Authentification requise", code=401, status_code=401)

            role = g.user.get("app_role")
            if role is None:
                try:
                    role = get_app_role(g.user.get("id"), g.user.get("email"))
                except Exception:
                    return error_response("Impossible de vérifier les permissions", code=503, status_code=503)
                g.user["app_role"] = role
                g.user["role"] = role

            if role not in allowed_roles:
                return error_response(
                    f"Accès refusé : le rôle '{role}' n'a pas la permission requise",
                    code=403, status_code=403
                )

            return f(*args, **kwargs)
        return decorated
    return decorator
