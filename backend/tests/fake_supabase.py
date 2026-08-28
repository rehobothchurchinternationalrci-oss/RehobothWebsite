"""
Double en memoire du client Supabase (PostgREST + Auth admin).

Pourquoi : les routes de l'espace departement n'utilisent pas BaseService, elles
appellent `get_supabase()` directement. Sans ce double, la suite de tests
parlait au VRAI projet Supabase — elle y creait des departements, des comptes
Auth et des fiches membres a chaque execution, et echouait des que le reseau ou
les cles n'etaient pas disponibles.

Ne reimplemente que ce que le code appelle reellement :
    table(...).select/insert/update/delete + eq/neq/in_/limit/order + execute
    auth.admin.create_user / list_users / update_user_by_id
    auth.sign_in_with_password / reset_password_for_email
"""

import uuid
from datetime import datetime, timezone
from types import SimpleNamespace


def _egal(gauche, droite) -> bool:
    """Comparaison laxiste : PostgREST recoit tout en texte dans l'URL."""
    if isinstance(droite, bool) or isinstance(gauche, bool):
        return str(gauche).lower() == str(droite).lower()
    return str(gauche) == str(droite)


class _Resultat:
    def __init__(self, data):
        self.data = data
        self.count = len(data) if isinstance(data, list) else None


class _Requete:
    """Constructeur de requete d'une table : chaine les filtres puis execute."""

    def __init__(self, tables, nom):
        self._tables = tables
        self._nom = nom
        self._op = "select"
        self._payload = None
        self._filtres = []
        self._ordre = None
        self._desc = False
        self._limite = None

    # -- operations ---------------------------------------------------------
    def select(self, *_args, **_kwargs):
        self._op = "select"
        return self

    def insert(self, data):
        self._op = "insert"
        self._payload = data
        return self

    def update(self, data):
        self._op = "update"
        self._payload = data
        return self

    def upsert(self, data):
        self._op = "insert"
        self._payload = data
        return self

    def delete(self):
        self._op = "delete"
        return self

    # -- filtres ------------------------------------------------------------
    def eq(self, colonne, valeur):
        self._filtres.append(("eq", colonne, valeur))
        return self

    def neq(self, colonne, valeur):
        self._filtres.append(("neq", colonne, valeur))
        return self

    def in_(self, colonne, valeurs):
        self._filtres.append(("in", colonne, list(valeurs)))
        return self

    def limit(self, n):
        self._limite = n
        return self

    def order(self, colonne, desc=False):
        self._ordre, self._desc = colonne, desc
        return self

    # -- execution ----------------------------------------------------------
    @property
    def _lignes(self):
        return self._tables.setdefault(self._nom, [])

    def _selection(self):
        retenues = []
        for ligne in self._lignes:
            garde = True
            for genre, colonne, valeur in self._filtres:
                actuelle = ligne.get(colonne)
                if genre == "eq" and not _egal(actuelle, valeur):
                    garde = False
                elif genre == "neq" and _egal(actuelle, valeur):
                    garde = False
                elif genre == "in" and not any(_egal(actuelle, v) for v in valeur):
                    garde = False
                if not garde:
                    break
            if garde:
                retenues.append(ligne)
        return retenues

    def execute(self):
        if self._op == "insert":
            entrees = self._payload if isinstance(self._payload, list) else [self._payload]
            crees = []
            for entree in entrees:
                ligne = dict(entree)
                ligne.setdefault("id", str(uuid.uuid4()))
                ligne.setdefault("created_at", datetime.now(timezone.utc).isoformat())
                self._lignes.append(ligne)
                crees.append(ligne)
            return _Resultat(crees)

        cibles = self._selection()

        if self._op == "update":
            for ligne in cibles:
                ligne.update(self._payload or {})
            return _Resultat(list(cibles))

        if self._op == "delete":
            for ligne in cibles:
                self._lignes.remove(ligne)
            return _Resultat(list(cibles))

        donnees = list(cibles)
        if self._ordre:
            donnees.sort(key=lambda l: str(l.get(self._ordre) or ""), reverse=self._desc)
        if self._limite:
            donnees = donnees[: self._limite]
        return _Resultat(donnees)


class _AuthAdmin:
    def __init__(self, comptes):
        self._comptes = comptes

    def create_user(self, payload):
        email = (payload.get("email") or "").lower()
        if any(c.email == email for c in self._comptes):
            # Meme message que Supabase : le code de production rattrape cette
            # exception pour reinitialiser le mot de passe au lieu d'echouer.
            raise ValueError("email already registered")
        compte = SimpleNamespace(
            id=str(uuid.uuid4()),
            email=email,
            password=payload.get("password"),
            user_metadata=payload.get("user_metadata") or {},
        )
        self._comptes.append(compte)
        return SimpleNamespace(user=compte)

    def list_users(self, page=1, per_page=100):
        debut = (page - 1) * per_page
        return self._comptes[debut:debut + per_page]

    def update_user_by_id(self, uid, payload):
        for compte in self._comptes:
            if compte.id == uid:
                for cle, valeur in payload.items():
                    setattr(compte, cle, valeur)
                return SimpleNamespace(user=compte)
        raise ValueError(f"user {uid} not found")


class _Auth:
    def __init__(self, comptes):
        self.admin = _AuthAdmin(comptes)
        self._comptes = comptes

    def sign_in_with_password(self, credentials):
        email = (credentials.get("email") or "").lower()
        for compte in self._comptes:
            if compte.email == email and compte.password == credentials.get("password"):
                return SimpleNamespace(
                    user=compte,
                    session=SimpleNamespace(access_token="jeton-de-test",
                                            refresh_token="rafraichissement-de-test"),
                )
        raise ValueError("Invalid login credentials")

    def reset_password_for_email(self, email, options=None):
        return SimpleNamespace(email=email)


class FakeSupabase:
    """Client Supabase de test : tout vit dans `tables` et `comptes`."""

    def __init__(self):
        self.tables = {}
        self.comptes = []
        self.auth = _Auth(self.comptes)

    def table(self, nom):
        return _Requete(self.tables, nom)

    def reset(self):
        self.tables.clear()
        self.comptes.clear()
