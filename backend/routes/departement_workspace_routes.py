import secrets
import uuid
from datetime import datetime
from flask import Blueprint, current_app, request, g
from config.settings import Config
from extensions import get_supabase, limiter
from middlewares.auth import token_required
from middlewares.rbac import role_required, department_scoped, ADMIN_ROLES
from utils.response import success_response, error_response
from services.email_service import EmailService

dept_ws_bp = Blueprint("departement_workspace", __name__, url_prefix="/api/departements")


def _chef_nom(responsable_id: str) -> str:
    if not responsable_id:
        return ""
    res = get_supabase().table("membres").select("prenom, nom").eq("user_id", responsable_id).execute()
    if res.data:
        m = res.data[0]
        return f"{m['prenom']} {m['nom']}"
    return ""


def _dept_payload(dept: dict) -> dict:
    return {
        "id":            dept["id"],
        "nom":           dept["nom"],
        "description":   dept.get("description"),
        "type":          dept.get("type"),
        "responsable_nom": _chef_nom(dept.get("responsable_id")),
        "jour_reunion":  dept.get("jour_reunion"),
        "heure_reunion": dept.get("heure_reunion"),
        "lieu_reunion":  dept.get("lieu_reunion"),
        "actif":         dept.get("actif", True),
    }


def _eglise_info() -> tuple[str, str]:
    """Retourne (church_name, logo_url)."""
    res = get_supabase().table("eglise_parametres").select("nom, logo_url").limit(1).execute()
    params = res.data[0] if res.data else {}
    name     = params.get("nom") or "Rehoboth Church International"
    logo_url = params.get("logo_url") or ""
    return name, logo_url


# 18 octets d'entropie -> 24 caractères url-safe. Le chef ne saisit ce mot de
# passe qu'une fois : `must_change_password` le force à le remplacer ensuite.
GENERATED_PASSWORD_BYTES = 18

# Champs du formulaire qui ne sont PAS des colonnes de `departements` : ils
# décrivent le chef à créer. Les laisser passer dans un INSERT/UPDATE fait
# échouer la requête (« column chef_prenom does not exist »).
CHAMPS_CHEF = ("chef_prenom", "chef_nom", "chef_email")

# Colonnes réellement modifiables sur `departements`
COLONNES_DEPARTEMENT = (
    "nom", "description", "type", "jour_reunion", "heure_reunion",
    "lieu_reunion", "couleur", "icone", "actif",
)


def _integrer_chef(dept: dict, chef_prenom: str, chef_nom: str, chef_email: str):
    """
    Crée (ou réactive) le compte du chef, sa fiche membre, son rattachement au
    département et son mandat, puis lui envoie ses identifiants.

    Utilisé à la création ET à la modification d'un département : sans ça, le
    formulaire d'édition proposerait un chef à créer sans que rien ne se passe.
    """
    supabase = get_supabase()
    dept_id  = dept["id"]

    chef_email_lower = chef_email.strip().lower()

    # Trouver ou créer le user
    u_res = supabase.table("users").select("*").eq("email", chef_email_lower).execute()

    if u_res.data:
        # Compte déjà existant : on ne touche PAS à son mot de passe. L'ancienne
        # version réécrivait le hash miroir sans mettre à jour Supabase Auth (qui
        # est la vraie source de vérité du login) : le mot de passe envoyé par
        # email ne fonctionnait donc pas. Elle repositionnait aussi
        # must_change_password sur un compte SUPER_ADMIN existant.
        # On se contente d'accorder le rôle ; l'intéressé garde ses identifiants.
        user               = u_res.data[0]
        compte_cree        = False
        generated_password = None

        if user["role"] not in ("SUPER_ADMIN", "PASTEUR", "SECRETAIRE"):
            supabase.table("users").update({"role": "CHEF_DEPARTEMENT"}) \
                .eq("id", user["id"]).execute()
    else:
        # Mot de passe imprévisible. L'ancienne formule « <nom>12345 » était
        # dérivable du nom du responsable, publié sur le site vitrine : n'importe
        # quel visiteur pouvait deviner les identifiants d'un chef de département.
        generated_password = secrets.token_urlsafe(GENERATED_PASSWORD_BYTES)

        from werkzeug.security import generate_password_hash
        hashed = generate_password_hash(generated_password)

        # Supabase Auth est la source de vérité du login (sign_in_with_password) :
        # un échec ici doit interrompre l'opération, sinon on crée une ligne
        # `users` orpheline dont personne ne peut jamais se connecter.
        supabase.auth.admin.create_user({
            "email":         chef_email_lower,
            "password":      generated_password,
            "email_confirm": True,
        })

        u_ins = supabase.table("users").insert({
            "email":                chef_email_lower,
            "password_hash":        hashed,
            "role":                 "CHEF_DEPARTEMENT",
            "is_active":            True,
            "email_verified":       True,
            "must_change_password": True,
        }).execute()
        user        = u_ins.data[0]
        compte_cree = True

    user_id = user["id"]

    # Trouver ou créer le membre
    m_res = supabase.table("membres").select("*").eq("email", chef_email_lower).execute()
    if m_res.data:
        membre = m_res.data[0]
        if not membre.get("user_id"):
            supabase.table("membres").update({"user_id": user_id}).eq("id", membre["id"]).execute()
    else:
        m_ins = supabase.table("membres").insert({
            "user_id": user_id,
            "prenom":  chef_prenom,
            "nom":     chef_nom,
            "email":   chef_email_lower,
            "statut":  "membre_actif",
        }).execute()
        membre = m_ins.data[0]

    # Un seul chef actif par département : relever le précédent (contrainte
    # uq_chef_departement_actif en base).
    supabase.table("chef_departement").update({"is_actif": False}) \
        .eq("departement_id", dept_id).eq("is_actif", True) \
        .neq("user_id", user_id).execute()

    # Lier responsable au département
    supabase.table("departements").update({"responsable_id": user_id}).eq("id", dept_id).execute()
    dept["responsable_id"] = user_id

    # Association membre ↔ département
    md_res = supabase.table("membre_departements").select("id") \
        .eq("membre_id", membre["id"]).eq("departement_id", dept_id).execute()
    if not md_res.data:
        supabase.table("membre_departements").insert({
            "membre_id":      membre["id"],
            "departement_id": dept_id,
        }).execute()

    # Enregistrer dans chef_departement
    cd_res = supabase.table("chef_departement").select("id") \
        .eq("user_id", user_id).eq("departement_id", dept_id).execute()
    if cd_res.data:
        supabase.table("chef_departement").update({"is_actif": True}) \
            .eq("id", cd_res.data[0]["id"]).execute()
    else:
        supabase.table("chef_departement").insert({
            "user_id":        user_id,
            "departement_id": dept_id,
        }).execute()

    # Email d'onboarding — un échec d'envoi ne doit pas annuler l'opération
    try:
        site_url = Config.FRONTEND_URL
        church_name, logo_url = _eglise_info()
        if not logo_url:
            logo_url = f"{request.host_url.rstrip('/')}/static/logo.jpeg"
        login_url = f"{site_url}/login"

        if compte_cree:
            from utils.email_templates import get_onboarding_email_html
            EmailService.send_email(
                to=chef_email_lower,
                subject=f"Vos identifiants de connexion - {church_name}",
                body=(f"Bonjour {chef_prenom} {chef_nom},\n\n"
                      f"Département '{dept.get('nom')}' : vous en êtes le responsable.\n"
                      f"Identifiants :\n"
                      f"- Email : {chef_email_lower}\n"
                      f"- Mot de passe provisoire : {generated_password}\n\n"
                      f"Il vous sera demandé de le changer à la première connexion.\n"
                      f"Connectez-vous sur {login_url}"),
                html=get_onboarding_email_html(
                    church_name=church_name, logo_url=logo_url,
                    chef_prenom=chef_prenom, chef_nom=chef_nom,
                    dept_name=dept.get("nom"), login_url=login_url,
                    email=chef_email_lower, password=generated_password,
                ),
            )
        else:
            # Compte préexistant : aucun mot de passe à communiquer, il conserve
            # le sien. On notifie seulement la prise de fonction.
            EmailService.send_email(
                to=chef_email_lower,
                subject=f"Vous êtes responsable de « {dept.get('nom')} » - {church_name}",
                body=(f"Bonjour {chef_prenom} {chef_nom},\n\n"
                      f"Vous venez d'être désigné(e) responsable du département "
                      f"'{dept.get('nom')}'.\n\n"
                      f"Connectez-vous avec vos identifiants habituels sur {login_url}\n"
                      f"Mot de passe oublié ? Utilisez « Mot de passe oublié » "
                      f"sur la page de connexion."),
            )
    except Exception as mail_err:
        current_app.logger.error(
            "Email onboarding chef (dept=%s) : %s", dept_id, mail_err
        )

    return dept


# ── 0. CREATE DEPARTMENT WITH CHEF ──────────────────────────────────────────
@dept_ws_bp.route("", methods=["POST"])
@token_required
@role_required(*ADMIN_ROLES)
def create_department_with_chef():
    payload  = request.get_json() or {}
    nom      = payload.get("nom")
    type_val = payload.get("type")

    if not nom or not type_val:
        return error_response("Le nom et le type du département sont requis", code=400, status_code=400)

    supabase    = get_supabase()
    chef_prenom = payload.get("chef_prenom")
    chef_nom    = payload.get("chef_nom")
    chef_email  = payload.get("chef_email")

    try:
        # Créer le département
        dept_data = {
            "nom":          nom,
            "description":  payload.get("description"),
            "type":         type_val,
            "jour_reunion": payload.get("jour_reunion"),
            "heure_reunion":payload.get("heure_reunion"),
            "lieu_reunion": payload.get("lieu_reunion"),
            "actif":        payload.get("actif", True),
        }
        dept_res = supabase.table("departements").insert(dept_data).execute()
        dept     = dept_res.data[0]
        dept_id  = dept["id"]

        if chef_email and chef_prenom and chef_nom:
            dept = _integrer_chef(dept, chef_prenom, chef_nom, chef_email)

        return success_response(_dept_payload(dept), status_code=201)

    except Exception as e:
        return error_response(str(e), code=500, status_code=500)


# ── 0 bis. UPDATE DEPARTMENT ────────────────────────────────────────────────
# Route dédiée plutôt que le CRUD générique : le formulaire d'édition envoie
# chef_prenom / chef_nom / chef_email, qui ne sont pas des colonnes de
# `departements`. Transmis tels quels à PostgREST, ils faisaient échouer la
# requête (erreur remontée jusqu'ici en « 503 »).
@dept_ws_bp.route("/<id>", methods=["PUT"])
@token_required
@role_required(*ADMIN_ROLES)
def update_department(id):
    payload  = request.get_json() or {}
    supabase = get_supabase()

    try:
        existant = supabase.table("departements").select("*").eq("id", id).execute()
        if not existant.data:
            return error_response("Département introuvable", code=404, status_code=404)

        # On ne garde que les vraies colonnes, et seulement celles fournies
        maj = {c: payload[c] for c in COLONNES_DEPARTEMENT if c in payload}
        if "responsable_id" in payload:
            maj["responsable_id"] = payload["responsable_id"] or None

        if maj:
            res  = supabase.table("departements").update(maj).eq("id", id).execute()
            dept = res.data[0] if res.data else existant.data[0]
        else:
            dept = existant.data[0]

        chef_prenom = payload.get("chef_prenom")
        chef_nom    = payload.get("chef_nom")
        chef_email  = payload.get("chef_email")
        if chef_email and chef_prenom and chef_nom:
            dept = _integrer_chef(dept, chef_prenom, chef_nom, chef_email)

        return success_response(_dept_payload(dept))

    except Exception as e:
        return error_response(str(e), code=500, status_code=500)


# ── 1. ASSIGN CHEF ───────────────────────────────────────────────────────────
@dept_ws_bp.route("/<id>/chef", methods=["POST"])
@token_required
@role_required(*ADMIN_ROLES)
def set_department_chef(id):
    payload   = request.get_json() or {}
    membre_id = payload.get("membre_id")
    if not membre_id:
        return error_response("membre_id est requis", code=400, status_code=400)

    supabase = get_supabase()

    dept_res = supabase.table("departements").select("*").eq("id", id).execute()
    if not dept_res.data:
        return error_response("Département introuvable", code=404, status_code=404)

    m_res = supabase.table("membres").select("*").eq("id", membre_id).execute()
    if not m_res.data:
        return error_response("Membre introuvable", code=404, status_code=404)

    member  = m_res.data[0]
    user_id = member.get("user_id")

    # La liste propose tous les membres, or la plupart n'ont pas de compte :
    # ils sont créés depuis l'annuaire, qui n'ouvre pas d'accès. On le crée
    # donc à la volée et on lui envoie ses identifiants, plutôt que de
    # refuser la désignation.
    if not user_id:
        email = (member.get("email") or "").strip()
        if not email:
            return error_response(
                f"{member.get('prenom')} {member.get('nom')} n'a pas d'adresse email : "
                "renseignez-la dans sa fiche membre pour pouvoir lui créer un accès.",
                code=400, status_code=400
            )
        try:
            _integrer_chef(dept_res.data[0], member.get("prenom"), member.get("nom"), email)
            return success_response({
                "message":  "Chef de département désigné ; ses identifiants lui ont été envoyés par email",
                "chef_nom": f"{member.get('prenom')} {member.get('nom')}",
            })
        except Exception as e:
            return error_response(str(e), code=500, status_code=500)

    try:
        # Désactiver l'ancien chef sur CE département
        supabase.table("chef_departement").update({"is_actif": False}).eq("departement_id", id).eq("is_actif", True).execute()

        # Upsert nouveau chef
        cd_res = supabase.table("chef_departement").select("id").eq("user_id", user_id).eq("departement_id", id).execute()
        if cd_res.data:
            supabase.table("chef_departement").update({"is_actif": True}).eq("id", cd_res.data[0]["id"]).execute()
        else:
            supabase.table("chef_departement").insert({"user_id": user_id, "departement_id": id}).execute()

        # Mettre à jour responsable_id du département
        supabase.table("departements").update({"responsable_id": user_id}).eq("id", id).execute()

        # Élever le rôle si nécessaire
        u_res = supabase.table("users").select("role").eq("id", user_id).execute()
        if u_res.data and u_res.data[0]["role"] not in ("SUPER_ADMIN", "PASTEUR", "SECRETAIRE"):
            supabase.table("users").update({"role": "CHEF_DEPARTEMENT"}).eq("id", user_id).execute()

        return success_response({
            "message":  "Chef de département mis à jour avec succès",
            "chef_nom": _chef_nom(user_id),
        })
    except Exception as e:
        return error_response(str(e), code=500, status_code=500)


# ── 2. MANAGE MEMBERS ────────────────────────────────────────────────────────
@dept_ws_bp.route("/<id>/membres", methods=["GET"])
@token_required
@department_scoped(*ADMIN_ROLES)
def get_dept_membres(id):
    try:
        supabase = get_supabase()

        md_res = supabase.table("membre_departements").select(
            "membre_id, membres(id, prenom, nom, email, telephone, photo_url, user_id)"
        ).eq("departement_id", id).execute()

        # Chefs actifs sur ce département
        cd_res      = supabase.table("chef_departement").select("user_id").eq("departement_id", id).eq("is_actif", True).execute()
        chef_uids   = {row["user_id"] for row in (cd_res.data or [])}

        membres = []
        for row in (md_res.data or []):
            m = row.get("membres") or {}
            membres.append({
                "id":        m.get("id"),
                "prenom":    m.get("prenom"),
                "nom":       m.get("nom"),
                "email":     m.get("email"),
                "telephone": m.get("telephone"),
                "photo_url": m.get("photo_url"),
                "est_chef":  m.get("user_id") in chef_uids if m.get("user_id") else False,
            })

        return success_response(membres)
    except Exception as e:
        return error_response(str(e), code=500, status_code=500)


@dept_ws_bp.route("/<id>/membres", methods=["POST"])
@token_required
@department_scoped(*ADMIN_ROLES)
def add_dept_membre(id):
    payload   = request.get_json() or {}
    membre_id = payload.get("membre_id")
    if not membre_id:
        return error_response("membre_id est requis", code=400, status_code=400)

    try:
        supabase = get_supabase()
        existing = supabase.table("membre_departements").select("id").eq("membre_id", membre_id).eq("departement_id", id).execute()
        if existing.data:
            return error_response("Ce membre est déjà dans le département", code=400, status_code=400)

        supabase.table("membre_departements").insert({"membre_id": membre_id, "departement_id": id}).execute()
        return success_response({"message": "Membre ajouté avec succès"})
    except Exception as e:
        return error_response(str(e), code=500, status_code=500)


@dept_ws_bp.route("/<id>/membres/<membre_id>", methods=["DELETE"])
@token_required
@department_scoped(*ADMIN_ROLES)
def delete_dept_membre(id, membre_id):
    try:
        supabase = get_supabase()
        existing = supabase.table("membre_departements").select("id").eq("membre_id", membre_id).eq("departement_id", id).execute()
        if not existing.data:
            return error_response("Relation introuvable", code=404, status_code=404)

        supabase.table("membre_departements").delete().eq("membre_id", membre_id).eq("departement_id", id).execute()
        return success_response({"message": "Membre retiré du département avec succès"})
    except Exception as e:
        return error_response(str(e), code=500, status_code=500)


# ── 3. MEETINGS ───────────────────────────────────────────────────────────────
@dept_ws_bp.route("/<id>/reunions", methods=["GET"])
@token_required
@department_scoped(*ADMIN_ROLES)
def get_dept_reunions(id):
    try:
        res = get_supabase().table("reunions_departement").select("*").eq("departement_id", id).order("date_reunion", desc=True).execute()
        return success_response([{
            "id":           r["id"],
            "titre":        r["titre"],
            "description":  r.get("description"),
            "date_reunion": r.get("date_reunion"),
            "lieu":         r.get("lieu"),
            "is_en_ligne":  r.get("is_en_ligne", False),
            "lien_reunion": r.get("lien_reunion"),
        } for r in (res.data or [])])
    except Exception as e:
        return error_response(str(e), code=500, status_code=500)


@dept_ws_bp.route("/<id>/reunions", methods=["POST"])
@token_required
@department_scoped(*ADMIN_ROLES)
def create_dept_reunion(id):
    payload  = request.get_json() or {}
    titre    = payload.get("titre")
    date_str = payload.get("date_reunion")
    if not titre or not date_str:
        return error_response("Titre et date sont requis", code=400, status_code=400)

    try:
        res = get_supabase().table("reunions_departement").insert({
            "departement_id": id,
            "titre":          titre,
            "description":    payload.get("description"),
            "date_reunion":   date_str,
            "lieu":           payload.get("lieu"),
            "is_en_ligne":    payload.get("is_en_ligne", False),
            "lien_reunion":   payload.get("lien_reunion"),
            "created_by":     g.user.get("id"),
        }).execute()
        r = res.data[0]
        return success_response({"id": r["id"], "titre": r["titre"]}, status_code=201)
    except Exception as e:
        return error_response(str(e), code=500, status_code=500)


# ── 4. ATTENDANCE ─────────────────────────────────────────────────────────────
@dept_ws_bp.route("/<id>/reunions/<reunion_id>/presences", methods=["GET"])
@token_required
@department_scoped(*ADMIN_ROLES)
def get_reunion_presences(id, reunion_id):
    try:
        supabase = get_supabase()

        md_res = supabase.table("membre_departements").select(
            "membres(id, prenom, nom)"
        ).eq("departement_id", id).execute()

        pr_res      = supabase.table("presences_reunion").select("membre_id, statut, note").eq("reunion_id", reunion_id).execute()
        statut_map  = {p["membre_id"]: p["statut"] for p in (pr_res.data or [])}
        note_map    = {p["membre_id"]: p.get("note", "") for p in (pr_res.data or [])}

        result = []
        for row in (md_res.data or []):
            m = row.get("membres") or {}
            mid = m.get("id")
            result.append({
                "membre_id": mid,
                "prenom":    m.get("prenom"),
                "nom":       m.get("nom"),
                "statut":    statut_map.get(mid, "ABSENT"),
                "note":      note_map.get(mid, ""),
            })

        return success_response(result)
    except Exception as e:
        return error_response(str(e), code=500, status_code=500)


@dept_ws_bp.route("/<id>/reunions/<reunion_id>/presences", methods=["POST"])
@token_required
@department_scoped(*ADMIN_ROLES)
def save_reunion_presences(id, reunion_id):
    presences_list = (request.get_json() or {}).get("presences", [])
    supabase       = get_supabase()

    try:
        for p in presences_list:
            mid    = p.get("membre_id")
            statut = p.get("statut", "ABSENT")
            note   = p.get("note", "")

            ex = supabase.table("presences_reunion").select("id").eq("reunion_id", reunion_id).eq("membre_id", mid).execute()
            if ex.data:
                supabase.table("presences_reunion").update({
                    "statut": statut, "note": note, "enregistre_par": g.user.get("id")
                }).eq("id", ex.data[0]["id"]).execute()
            else:
                supabase.table("presences_reunion").insert({
                    "reunion_id": reunion_id, "membre_id": mid,
                    "statut": statut, "note": note, "enregistre_par": g.user.get("id"),
                }).execute()

        return success_response({"message": "Présences enregistrées avec succès"})
    except Exception as e:
        return error_response(str(e), code=500, status_code=500)


# ── 5. NOTIFICATIONS ─────────────────────────────────────────────────────────
@dept_ws_bp.route("/<id>/notifications", methods=["POST"])
@token_required
@department_scoped(*ADMIN_ROLES)
def send_dept_notifications(id):
    payload = request.get_json() or {}
    sujet   = payload.get("sujet")
    contenu = payload.get("contenu")
    if not sujet or not contenu:
        return error_response("Sujet et contenu sont requis", code=400, status_code=400)

    try:
        supabase = get_supabase()
        dept_res = supabase.table("departements").select("nom").eq("id", id).execute()
        if not dept_res.data:
            return error_response("Département introuvable", code=404, status_code=404)
        dept_nom = dept_res.data[0]["nom"]

        md_res = supabase.table("membre_departements").select(
            "membres(email)"
        ).eq("departement_id", id).execute()

        emails = [
            row["membres"]["email"]
            for row in (md_res.data or [])
            if row.get("membres") and row["membres"].get("email")
        ]

        if not emails:
            return success_response({"message": "Aucun membre avec un email", "envoyes": 0})

        church_name, logo_url = _eglise_info()
        if not logo_url:
            logo_url = f"{request.host_url.rstrip('/')}/static/logo.jpeg"

        from utils.email_templates import get_department_message_html
        sent_count = 0
        for email in emails:
            try:
                EmailService.send_email(
                    to=email, subject=f"[{dept_nom}] {sujet}", body=contenu,
                    html=get_department_message_html(
                        church_name=church_name, logo_url=logo_url,
                        dept_name=dept_nom, subject=sujet, message_content=contenu,
                    ),
                )
                sent_count += 1
            except Exception as mail_err:
                print(f"Email error ({email}): {mail_err}")

        supabase.table("communications").insert({
            "sujet": sujet, "contenu": contenu, "destinataires_type": "departement",
            "departement_id": id, "departement_nom": dept_nom,
            "nb_destinataires": sent_count, "statut": "envoye",
        }).execute()

        return success_response({"message": f"Message envoyé à {sent_count} membre(s)", "envoyes": sent_count})
    except Exception as e:
        return error_response(str(e), code=500, status_code=500)


# ── 6. RAPPORTS ───────────────────────────────────────────────────────────────
@dept_ws_bp.route("/<id>/rapports", methods=["GET"])
@token_required
@department_scoped(*ADMIN_ROLES)
def get_dept_rapports(id):
    try:
        res = get_supabase().table("rapports_departement").select(
            "*, users(membres(prenom, nom))"
        ).eq("departement_id", id).order("annee", desc=True).order("mois", desc=True).execute()

        result = []
        for r in (res.data or []):
            membre_info = (r.get("users") or {}).get("membres") or {}
            prenom = membre_info.get("prenom")
            nom    = membre_info.get("nom")
            result.append({
                "id":          r["id"],
                "mois":        r["mois"],
                "annee":       r["annee"],
                "contenu":     r["contenu"],
                "nb_membres":  r.get("nb_membres"),
                "nb_reunions": r.get("nb_reunions"),
                "soumis_le":   r.get("soumis_le"),
                "soumis_par":  f"{prenom} {nom}" if prenom else "Chef de département",
            })
        return success_response(result)
    except Exception as e:
        return error_response(str(e), code=500, status_code=500)


@dept_ws_bp.route("/<id>/rapports", methods=["POST"])
@token_required
@department_scoped(*ADMIN_ROLES)
def submit_dept_rapport(id):
    payload = request.get_json() or {}
    mois    = payload.get("mois")
    annee   = payload.get("annee")
    contenu = payload.get("contenu")

    if not mois or not annee or not contenu:
        return error_response("Mois, année et contenu sont requis", code=400, status_code=400)

    try:
        supabase = get_supabase()

        ex = supabase.table("rapports_departement").select("id").eq("departement_id", id).eq("mois", mois).eq("annee", annee).execute()
        if ex.data:
            return error_response(f"Un rapport pour {mois}/{annee} existe déjà", code=400, status_code=400)

        nb_membres  = len(supabase.table("membre_departements").select("id").eq("departement_id", id).execute().data or [])

        res = supabase.table("rapports_departement").insert({
            "departement_id": id, "mois": mois, "annee": annee, "contenu": contenu,
            "nb_membres": nb_membres, "soumis_par": g.user.get("id"),
        }).execute()
        r = res.data[0]
        return success_response({"id": r["id"], "message": "Rapport soumis avec succès"}, status_code=201)
    except Exception as e:
        return error_response(str(e), code=500, status_code=500)


# ── 7. DOCUMENTS ──────────────────────────────────────────────────────────────
@dept_ws_bp.route("/<id>/documents", methods=["GET"])
@token_required
@department_scoped(*ADMIN_ROLES)
def get_dept_documents(id):
    try:
        res = get_supabase().table("documents").select(
            "*, users(membres(prenom, nom))"
        ).eq("departement_id", id).order("created_at", desc=True).execute()

        result = []
        for d in (res.data or []):
            m_info = (d.get("users") or {}).get("membres") or {}
            result.append({
                "id":           d["id"],
                "nom":          d["nom"],
                "description":  d.get("description"),
                "fichier_url":  d["fichier_url"],
                "type_mime":    d.get("type_mime"),
                "taille_bytes": d.get("taille_bytes"),
                "created_at":   d.get("created_at"),
                "uploade_par":  f"{m_info.get('prenom')} {m_info.get('nom')}" if m_info.get("prenom") else "Inconnu",
            })
        return success_response(result)
    except Exception as e:
        return error_response(str(e), code=500, status_code=500)


@dept_ws_bp.route("/<id>/documents", methods=["POST"])
@token_required
@department_scoped(*ADMIN_ROLES)
def add_dept_document(id):
    payload     = request.get_json() or {}
    nom         = payload.get("nom")
    fichier_url = payload.get("fichier_url")
    if not nom or not fichier_url:
        return error_response("Nom et URL de fichier sont requis", code=400, status_code=400)

    try:
        res = get_supabase().table("documents").insert({
            "nom": nom, "description": payload.get("description"),
            "fichier_url": fichier_url, "type_mime": payload.get("type_mime"),
            "taille_bytes": payload.get("taille_bytes", 0),
            "est_public": payload.get("est_public", False),
            "departement_id": id, "uploade_par": g.user.get("id"),
        }).execute()
        d = res.data[0]
        return success_response({"id": d["id"], "nom": d["nom"], "message": "Ressource ajoutée"}, status_code=201)
    except Exception as e:
        return error_response(str(e), code=500, status_code=500)


@dept_ws_bp.route("/<id>/documents/<doc_id>", methods=["DELETE"])
@token_required
@department_scoped(*ADMIN_ROLES)
def delete_dept_document(id, doc_id):
    try:
        supabase = get_supabase()
        ex = supabase.table("documents").select("id").eq("id", doc_id).eq("departement_id", id).execute()
        if not ex.data:
            return error_response("Document introuvable", code=404, status_code=404)

        supabase.table("documents").delete().eq("id", doc_id).execute()
        return success_response({"message": "Ressource supprimée avec succès"})
    except Exception as e:
        return error_response(str(e), code=500, status_code=500)


# ── 8. PUBLIC JOIN ────────────────────────────────────────────────────────────
@dept_ws_bp.route("/<id>/rejoindre", methods=["POST"])
# Route publique qui INSÈRE dans `membres` : sans plafond, elle permettait de
# polluer l'annuaire indéfiniment depuis l'extérieur.
@limiter.limit("5 per hour; 20 per day")
def public_join_department(id):
    payload   = request.get_json() or {}
    prenom    = payload.get("prenom")
    nom       = payload.get("nom")
    email     = payload.get("email")

    if not prenom or not nom or not email:
        return error_response("Prénom, nom et email sont requis", code=400, status_code=400)

    try:
        uuid.UUID(id)
    except ValueError:
        return error_response("ID de département invalide", code=400, status_code=400)

    try:
        supabase = get_supabase()

        dept_res = supabase.table("departements").select("nom").eq("id", id).execute()
        if not dept_res.data:
            return error_response("Département introuvable", code=404, status_code=404)
        dept_nom = dept_res.data[0]["nom"]

        email_lower = email.strip().lower()

        m_res = supabase.table("membres").select("id").eq("email", email_lower).execute()
        if m_res.data:
            membre_id = m_res.data[0]["id"]
            if payload.get("telephone"):
                supabase.table("membres").update({"telephone": payload["telephone"]}).eq("id", membre_id).execute()
        else:
            ins = supabase.table("membres").insert({
                "prenom": prenom.strip(), "nom": nom.strip(),
                "email":  email_lower,
                "telephone": payload.get("telephone"),
                "adresse":   payload.get("adresse"),
                "statut":    "membre_actif",
            }).execute()
            membre_id = ins.data[0]["id"]

        ex = supabase.table("membre_departements").select("id").eq("membre_id", membre_id).eq("departement_id", id).execute()
        if ex.data:
            return success_response({"message": f"Vous êtes déjà membre du département {dept_nom}"})

        supabase.table("membre_departements").insert({"membre_id": membre_id, "departement_id": id}).execute()
        return success_response({"message": f"Félicitations ! Vous avez rejoint {dept_nom} avec succès."}, status_code=201)

    except Exception as e:
        return error_response(str(e), code=500, status_code=500)
