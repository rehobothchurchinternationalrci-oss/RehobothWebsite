import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    SUPABASE_URL              = os.getenv("SUPABASE_URL")
    SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    SUPABASE_KEY              = SUPABASE_SERVICE_ROLE_KEY  # alias pour le client supabase-py

    FLASK_ENV = os.getenv("FLASK_ENV", "production")
    DEBUG     = FLASK_ENV == "development"
    TESTING   = FLASK_ENV == "testing"

    # URL publique du site (frontend), utilisee pour construire les liens envoyes
    # par email : reinitialisation de mot de passe, onboarding des chefs, etc.
    # Ne jamais deduire ces liens de request.host_url : cote Railway cela pointe
    # vers l'API, pas vers le site.
    FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173").rstrip("/")

    # Stockage des compteurs de rate limiting. "memory://" suffit pour freiner
    # bruteforce et spam, mais chaque worker gunicorn compte de son côté et les
    # compteurs repartent à zéro au redéploiement. Renseigner une URL Redis
    # (redis://...) pour un décompte exact et partagé entre workers.
    RATELIMIT_STORAGE_URI = os.getenv("RATELIMIT_STORAGE_URI", "memory://")

    # Origines autorisees pour les appels navigateur, separees par des virgules.
    # "*" (defaut) autorise tout le monde ; en production, y mettre l'URL du frontend.
    CORS_ORIGINS = [
        origin.strip()
        for origin in os.getenv("CORS_ORIGINS", "*").split(",")
        if origin.strip()
    ] or ["*"]

    # Hotes consideres comme locaux : un FRONTEND_URL reste sur l'un d'eux en
    # production signifie que la variable n'a pas ete definie sur la plateforme.
    _HOTES_LOCAUX = {"localhost", "127.0.0.1", "0.0.0.0", "::1", "[::1]"}

    @classmethod
    def frontend_url_est_local(cls) -> bool:
        """Le site public pointe-t-il encore vers une adresse de developpement ?

        Sert au diagnostic exposé par /api/health/ready : une valeur locale en
        production ne casse pas l'application, mais rend morts tous les liens
        envoyés par email (réinitialisation de mot de passe, onboarding des
        chefs de département), sans qu'aucune erreur ne le signale.
        """
        from urllib.parse import urlparse
        try:
            hote = (urlparse(cls.FRONTEND_URL).hostname or "").lower()
        except ValueError:
            return False
        return hote in cls._HOTES_LOCAUX

    @classmethod
    def validate(cls):
        missing = []
        if not cls.SUPABASE_URL:
            missing.append("SUPABASE_URL")
        if not cls.SUPABASE_SERVICE_ROLE_KEY:
            missing.append("SUPABASE_SERVICE_ROLE_KEY")
        if missing:
            raise ValueError(f"Variables d'environnement manquantes : {', '.join(missing)}")
