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

# Nom attendu par le runtime Python de Vercel.
__all__ = ["app"]
