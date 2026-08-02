from flask import Blueprint, request, g
from supabase import create_client
from config.settings import Config
from extensions import get_supabase, limiter
from middlewares.auth import token_required
from utils.response import success_response, error_response

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")


def _get_auth_client():
    return create_client(Config.SUPABASE_URL, Config.SUPABASE_SERVICE_ROLE_KEY)


def _sync_user(user_id: str, email: str) -> dict:
    """S'assure que l'utilisateur existe dans la table users et membres."""
    supabase = get_supabase()

    res = supabase.table("users").select("*").eq("id", user_id).execute()
    if res.data:
        user = res.data[0]
    else:
        user = {
            "id":             user_id,
            "email":          email,
            "password_hash":  "supabase_managed",
            "role":           "MEMBRE",
            "is_active":      True,
            "email_verified": True,
        }
        ins = supabase.table("users").insert(user).execute()
        user = ins.data[0] if ins.data else user

    # Créer la fiche membre si absente
    m_res = supabase.table("membres").select("id").eq("email", email).execute()
    if not m_res.data:
        part = email.split("@")[0]
        supabase.table("membres").insert({
            "user_id": user_id,
            "prenom":  part.capitalize(),
            "nom":     "Membre",
            "email":   email,
            "statut":  "membre_actif",
        }).execute()

    return user


def _get_user_profile(user_id: str, email: str, role: str, must_change: bool) -> dict:
    supabase = get_supabase()

    member_res = supabase.table("membres").select("*").eq("email", email).execute()
    member = member_res.data[0] if member_res.data else None

    profile = {
        "id":                  user_id,
        "email":               email,
        "role":                role,
        "must_change_password": must_change,
    }

    if member:
        profile.update({
            "member_id": member.get("id"),
            "nom":       member.get("nom"),
            "prenom":    member.get("prenom"),
            "statut":    member.get("statut"),
            "photo_url": member.get("photo_url"),
            # 'M' | 'F' | None — sert à l'appellation « Frère » / « Sœur »
            "genre":     member.get("genre"),
        })

    # Départements gérés (pour CHEF_DEPARTEMENT)
    cd_res = supabase.table("chef_departement").select(
        "departement_id, departements(id, nom)"
    ).eq("user_id", user_id).eq("is_actif", True).execute()

    profile["managed_departments"] = [
        {"id": row["departements"]["id"], "nom": row["departements"]["nom"]}
        for row in (cd_res.data or [])
        if row.get("departements")
    ]

    return profile


# ── LOGIN ─────────────────────────────────────────────────────────────────────
# Le bruteforce était jusqu'ici sans contrainte : combiné aux mots de passe
# générés « <nom>12345 », n'importe quel compte chef tombait en quelques essais.
@auth_bp.route("/login", methods=["POST"])
@limiter.limit("10 per minute; 50 per hour")
def login():
    payload  = request.get_json() or {}
    email    = payload.get("email")
    password = payload.get("password")

    if not email or not password:
        return error_response("Email et mot de passe requis", code=400, status_code=400)

    try:
        client = _get_auth_client()
        res    = client.auth.sign_in_with_password({"email": email, "password": password})

        user_rec    = _sync_user(res.user.id, res.user.email)
        role        = user_rec.get("role", "MEMBRE")
        must_change = user_rec.get("must_change_password", False)

        profile = _get_user_profile(res.user.id, res.user.email, role, must_change)
        return success_response({
            "access_token":  res.session.access_token,
            "refresh_token": res.session.refresh_token,
            "user":          profile,
        })
    except Exception as e:
        return error_response(
            "Identifiants incorrects ou erreur de connexion",
            code=401, status_code=401
        )


# ── FORGOT PASSWORD ───────────────────────────────────────────────────────────
@auth_bp.route("/forgot-password", methods=["POST"])
@limiter.limit("5 per hour")
def forgot_password():
    payload = request.get_json() or {}
    email   = payload.get("email")
    if not email:
        return error_response("Email requis", code=400, status_code=400)

    try:
        # Sans redirect_to explicite, Supabase retombe sur le "Site URL" du projet
        # (reste sur localhost tant qu'il n'est pas change), d'ou des liens morts.
        _get_auth_client().auth.reset_password_for_email(
            email, {"redirect_to": f"{Config.FRONTEND_URL}/reset-password"}
        )
        return success_response({"message": "Email de réinitialisation envoyé"})
    except Exception as e:
        return error_response(str(e), code=400, status_code=400)


# ── RESET PASSWORD ────────────────────────────────────────────────────────────
@auth_bp.route("/reset-password", methods=["POST"])
@token_required
def reset_password():
    payload      = request.get_json() or {}
    new_password = payload.get("new_password")
    if not new_password:
        return error_response("Nouveau mot de passe requis", code=400, status_code=400)

    user_id = g.user.get("id")
    supabase = get_supabase()

    # Source de vérité : Supabase Auth (le login passe par sign_in_with_password).
    # L'API admin est requise car le client service_role n'a pas de session utilisateur.
    try:
        _get_auth_client().auth.admin.update_user_by_id(user_id, {"password": new_password})
    except Exception as e:
        return error_response(
            "Impossible de mettre à jour le mot de passe", code=500, status_code=500
        )

    # Synchroniser la table users locale (hash miroir + levée du flag)
    from werkzeug.security import generate_password_hash
    supabase.table("users").update({
        "password_hash":        generate_password_hash(new_password),
        "must_change_password": False,
    }).eq("id", user_id).execute()

    return success_response({"message": "Mot de passe réinitialisé avec succès"})


# ── ME ────────────────────────────────────────────────────────────────────────
@auth_bp.route("/me", methods=["GET"])
@token_required
def me():
    user_id = g.user.get("id")
    email   = g.user.get("email")

    user_rec    = _sync_user(user_id, email)
    role        = user_rec.get("role", "MEMBRE")
    must_change = user_rec.get("must_change_password", False)

    return success_response(_get_user_profile(user_id, email, role, must_change))


# ── UPLOAD (Supabase Storage) ─────────────────────────────────────────────────
# Les buckets et leurs limites sont définis dans backend/storage_buckets.sql :
# ces règles doivent rester identiques, sinon le stockage rejette le fichier
# après coup avec une erreur peu lisible.
IMAGE_EXTENSIONS = {"jpg", "jpeg", "png", "gif", "webp"}
DOC_EXTENSIONS   = {"pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt"}

UPLOAD_BUCKETS = {
    "logos":          {"exts": IMAGE_EXTENSIONS,               "max_mo": 10,  "public": True},
    "photos-membres": {"exts": IMAGE_EXTENSIONS,               "max_mo": 10,  "public": True},
    "evenements":     {"exts": IMAGE_EXTENSIONS,               "max_mo": 10,  "public": True},
    "galerie":        {"exts": IMAGE_EXTENSIONS | {"mp4"},     "max_mo": 25,  "public": True},
    "medias":         {"exts": {"mp3", "mp4", "jpg", "jpeg", "png", "webp"},
                                                               "max_mo": 200, "public": True},
    "documents":      {"exts": DOC_EXTENSIONS | IMAGE_EXTENSIONS, "max_mo": 25, "public": False},
}
DEFAULT_BUCKET = "photos-membres"

# Conservé pour compatibilité : union de tous les formats acceptés
ALLOWED_UPLOAD_EXTENSIONS = set().union(*(b["exts"] for b in UPLOAD_BUCKETS.values()))

CONTENT_TYPES = {
    "jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png",
    "gif": "image/gif",  "webp": "image/webp", "mp3": "audio/mpeg",
    "mp4": "video/mp4",  "pdf": "application/pdf", "txt": "text/plain",
    "doc":  "application/msword",
    "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "xls":  "application/vnd.ms-excel",
    "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "ppt":  "application/vnd.ms-powerpoint",
    "pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
}

SIGNED_URL_TTL = 3600  # 1 h


def _resolve_bucket(demande: str, ext: str) -> str:
    """Bucket demandé s'il est valide, sinon déduit de l'extension."""
    if demande in UPLOAD_BUCKETS:
        return demande
    if ext in DOC_EXTENSIONS:
        return "documents"
    if ext in {"mp3", "mp4"}:
        return "medias"
    return DEFAULT_BUCKET


def _signed_url(bucket: str, path: str) -> str:
    res = get_supabase().storage.from_(bucket).create_signed_url(path, SIGNED_URL_TTL)
    # la clé varie selon la version de supabase-py
    return res.get("signedURL") or res.get("signedUrl") or res.get("signed_url") or ""


@auth_bp.route("/upload", methods=["POST"])
@limiter.limit("30 per hour")
@token_required
def upload_file():
    import os
    import uuid
    from werkzeug.utils import secure_filename

    if "file" not in request.files:
        return error_response("Aucun fichier fourni", code=400, status_code=400)

    file = request.files["file"]
    if not file.filename:
        return error_response("Aucun fichier sélectionné", code=400, status_code=400)

    filename = secure_filename(file.filename)
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""

    bucket = _resolve_bucket((request.form.get("bucket") or "").strip(), ext)
    regles = UPLOAD_BUCKETS[bucket]

    if ext not in regles["exts"]:
        return error_response(
            f"Type de fichier non autorisé (.{ext}) pour « {bucket} ». Formats acceptés : "
            f"{', '.join(sorted(regles['exts']))}",
            code=400, status_code=400
        )

    file.seek(0, os.SEEK_END)
    size = file.tell()
    file.seek(0)
    if size > regles["max_mo"] * 1024 * 1024:
        return error_response(
            f"Fichier trop volumineux (maximum {regles['max_mo']} Mo)",
            code=400, status_code=400
        )

    # Dossier aléatoire : évite les collisions tout en gardant le nom d'origine
    path = f"{uuid.uuid4().hex}/{filename}"

    try:
        get_supabase().storage.from_(bucket).upload(
            path,
            file.read(),
            {"content-type": CONTENT_TYPES.get(ext, "application/octet-stream"),
             "upsert": "false"},
        )
    except Exception as e:
        return error_response(f"Échec du téléversement : {e}", code=502, status_code=502)

    if regles["public"]:
        # URL permanente servie par le CDN Supabase
        url = get_supabase().storage.from_(bucket).get_public_url(path)
    else:
        # Bucket privé : l'URL signée expire, c'est `path` qu'il faut stocker
        # en base et repasser à /auth/file-url au moment de la consultation.
        url = _signed_url(bucket, path)

    return success_response({
        "url":    url,
        "bucket": bucket,
        "path":   path,
        "public": regles["public"],
    })


@auth_bp.route("/file-url", methods=["POST"])
@token_required
def get_file_url():
    """Régénère une URL signée pour un fichier d'un bucket privé."""
    payload = request.get_json() or {}
    bucket  = (payload.get("bucket") or "documents").strip()
    path    = (payload.get("path") or "").strip()

    if bucket not in UPLOAD_BUCKETS:
        return error_response("Bucket inconnu", code=400, status_code=400)
    if not path:
        return error_response("Chemin du fichier requis", code=400, status_code=400)

    if UPLOAD_BUCKETS[bucket]["public"]:
        return success_response({
            "url": get_supabase().storage.from_(bucket).get_public_url(path)
        })

    try:
        return success_response({"url": _signed_url(bucket, path)})
    except Exception as e:
        return error_response(f"Fichier introuvable : {e}", code=404, status_code=404)
