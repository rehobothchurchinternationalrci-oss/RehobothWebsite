"""
Point d'entrée des fonctions serverless Vercel.

Vercel transforme chaque fichier de `api/` en fonction et, côté Python, cherche
une variable `app` exposant une application WSGI. La réécriture déclarée dans
`vercel.json` envoie toutes les requêtes ici en conservant leur chemin d'origine
(`/api/health`, `/api/membres`, …), que Flask route ensuite normalement.

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
