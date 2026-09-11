"""
Point d'entrée des fonctions serverless Vercel.

Le runtime Python de Vercel cherche dans ce module une variable `app` exposant
une application WSGI. Le routage de `vercel.json` (`routes` → `dest`) lui envoie
toutes les URL en conservant le chemin d'origine (`/api/health`, `/api/membres`,
`/static/logo.jpeg`…), que Flask route ensuite normalement.

Ce fichier n'est qu'un adaptateur : `app.py` à la racine du backend reste la
source unique. Gunicorn (Railway, local) et Vercel démarrent la même
application, sans divergence de comportement possible.
"""
import os
import sys

# La fonction s'exécute depuis `api/`. Sans cette ligne, `import app` et les
# paquets voisins (`config`, `routes`, `services`…) sont introuvables.
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import app  # noqa: E402  (l'import doit suivre la mise à jour du path)


# ─────────────────────────────────────────────────────────────────────────────
# DIAGNOSTIC TEMPORAIRE — à supprimer une fois le routage confirmé.
#
# Une première configuration (`rewrites` vers `/api/index`) ne transmettait pas
# le chemin d'origine à la fonction : Flask répondait 404 sur absolument tout,
# y compris `/static/logo.jpeg` qu'il sert pourtant nativement. Impossible de
# savoir ce qu'il recevait réellement, Vercel n'exposant pas `x-matched-path`.
#
# Ce fourre-tout ne se déclenche que si AUCUNE route ne correspond : il renvoie
# le 404 habituel, enrichi du chemin vu par Flask. Si le routage est correct, il
# ne s'active jamais sur une URL valide.
# ─────────────────────────────────────────────────────────────────────────────
from flask import jsonify, request  # noqa: E402


@app.route("/", defaults={"chemin": ""})
@app.route("/<path:chemin>")
def _diagnostic_routage_vercel(chemin):
    return jsonify({
        "success": False,
        "data": None,
        "error": {"code": 404, "message": "Endpoint ou ressource introuvable"},
        "_diagnostic": {
            "path_vu_par_flask": request.path,
            "script_name": request.environ.get("SCRIPT_NAME", ""),
            "path_info": request.environ.get("PATH_INFO", ""),
            "query": request.environ.get("QUERY_STRING", ""),
            "x_forwarded_uri": request.headers.get("X-Forwarded-Uri", ""),
            "routes_connues": sorted(
                str(r) for r in app.url_map.iter_rules() if str(r).startswith("/api/health")
            ),
        },
    }), 404


# Nom attendu par le runtime Python de Vercel.
__all__ = ["app"]
