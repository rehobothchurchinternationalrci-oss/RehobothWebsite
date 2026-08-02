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


def _resolve_role() -> str:
    """Rôle applicatif de l'appelant, mémorisé sur g.user pour la requête."""
    role = g.user.get("app_role")
    if role is None:
        role = get_app_role(g.user.get("id"), g.user.get("email"))
        g.user["app_role"] = role
        g.user["role"]     = role
    return role


def user_manages_department(user_id: str, departement_id: str) -> bool:
    """
    L'utilisateur dirige-t-il ce département ?

    Réplique la fonction SQL public.app_is_chef(uuid) (migration 004) : le
    backend utilise la clé service_role, qui contourne le RLS, donc cette
    vérification doit être refaite ici. Deux sources font foi, comme en base :
    un mandat actif dans chef_departement, ou responsable_id sur le département.
    """
    if not user_id or not departement_id:
        return False

    from extensions import get_supabase
    supabase = get_supabase()

    cd = supabase.table("chef_departement").select("id") \
        .eq("user_id", user_id).eq("departement_id", departement_id) \
        .eq("is_actif", True).limit(1).execute()
    if cd.data:
        return True

    dept = supabase.table("departements").select("id") \
        .eq("id", departement_id).eq("responsable_id", user_id) \
        .limit(1).execute()
    return bool(dept.data)


def department_scoped(*admin_roles, param: str = "id"):
    """
    Restreint une route portant un identifiant de département dans son URL.

    - Les rôles passés en argument (ADMIN_ROLES en pratique) voient tous
      les départements.
    - CHEF_DEPARTEMENT n'accède qu'aux départements qu'il dirige effectivement.
    - Tout autre rôle est refusé.

    Sans ce contrôle, @role_required(*DEPT_ROLES) laissait n'importe quel chef
    lire et écrire les données de TOUS les départements (annuaire, réunions,
    présences, rapports, documents, envoi d'emails de masse).

    À appliquer APRÈS token_required.
    """
    admin_roles = tuple(admin_roles)

    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            if not getattr(g, "user", None):
                return error_response("Authentification requise", code=401, status_code=401)

            try:
                role = _resolve_role()
            except Exception:
                return error_response("Impossible de vérifier les permissions", code=503, status_code=503)

            if role in admin_roles:
                return f(*args, **kwargs)

            if role != "CHEF_DEPARTEMENT":
                return error_response(
                    f"Accès refusé : le rôle '{role}' n'a pas la permission requise",
                    code=403, status_code=403
                )

            departement_id = kwargs.get(param)
            try:
                autorise = user_manages_department(g.user.get("id"), departement_id)
            except Exception:
                return error_response("Impossible de vérifier les permissions", code=503, status_code=503)

            if not autorise:
                # Même message et même code qu'un département inexistant : ne pas
                # révéler l'existence d'un département qu'on ne dirige pas.
                return error_response(
                    "Accès refusé : vous ne dirigez pas ce département",
                    code=403, status_code=403
                )

            return f(*args, **kwargs)
        return decorated
    return decorator


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

            try:
                role = _resolve_role()
            except Exception:
                return error_response("Impossible de vérifier les permissions", code=503, status_code=503)

            if role not in allowed_roles:
                return error_response(
                    f"Accès refusé : le rôle '{role}' n'a pas la permission requise",
                    code=403, status_code=403
                )

            return f(*args, **kwargs)
        return decorated
    return decorator
