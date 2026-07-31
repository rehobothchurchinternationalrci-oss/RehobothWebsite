import requests
from functools import wraps
from flask import request, g
from config.settings import Config
from utils.response import error_response


def resolve_user(token: str):
    """
    Valide un token JWT via l'API Supabase Auth.
    Retourne le dict utilisateur ({id, email, role}) ou None si invalide.
    Lève requests.Timeout si le service ne répond pas.
    """
    res = requests.get(
        f"{Config.SUPABASE_URL}/auth/v1/user",
        headers={
            "apikey":        Config.SUPABASE_SERVICE_ROLE_KEY,
            "Authorization": f"Bearer {token}",
        },
        timeout=5,
    )
    if res.status_code != 200:
        return None

    data = res.json()
    return {
        "id":    data.get("id"),
        "email": data.get("email"),
        "role":  data.get("role", "authenticated"),
    }


def token_required(f):
    """
    Valide le token JWT via l'API Supabase Auth.
    Attache les données utilisateur dans flask.g.user.
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            return error_response("Authorization header manquant ou invalide", code=401, status_code=401)

        token = auth_header.split(" ")[1]

        # Seule la validation du token est protégée ici. L'appel au handler doit
        # rester EN DEHORS du try : sinon la moindre erreur applicative (requête
        # SQL invalide, colonne inconnue...) ressort en 503 « Erreur
        # d'authentification », ce qui masque complètement la cause réelle.
        try:
            user = resolve_user(token)
        except requests.Timeout:
            return error_response("Service d'authentification indisponible (timeout)", code=503, status_code=503)
        except Exception as e:
            return error_response(f"Erreur d'authentification : {str(e)}", code=503, status_code=503)

        if not user:
            return error_response("Token invalide ou expiré", code=401, status_code=401)

        g.user = user
        return f(*args, **kwargs)

    return decorated
