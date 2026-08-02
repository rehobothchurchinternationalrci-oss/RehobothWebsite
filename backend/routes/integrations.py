import os
from flask import Blueprint, g, request
from extensions import limiter
from services.email_service import EmailService
from models.schemas import SendEmailSchema
from middlewares.auth import resolve_user
from middlewares.rbac import DEPT_ROLES, get_app_role
from utils.response import success_response, error_response
from pydantic import ValidationError

integrations_bp = Blueprint("integrations", __name__, url_prefix="/api/integrations")

# Bornes de taille du formulaire de contact public : évite qu'un appel anonyme
# ne pousse un email de plusieurs mégaoctets.
SUJET_MAX = 200
CORPS_MAX = 5000


def _caller_is_staff() -> bool:
    """
    Vrai si la requête porte un token valide d'un rôle autorisé à emailer librement.

    Le résultat est mémoïsé sur `g` : la fonction est consultée deux fois par
    requête (exemption du rate limiting, puis choix du destinataire) et chaque
    appel coûte sinon deux allers-retours réseau vers Supabase.
    """
    cached = getattr(g, "_caller_is_staff", None)
    if cached is not None:
        return cached

    resultat = False
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        try:
            user = resolve_user(auth_header.split(" ")[1])
            if user:
                resultat = get_app_role(user.get("id"), user.get("email")) in DEPT_ROLES
        except Exception:
            resultat = False

    g._caller_is_staff = resultat
    return resultat


@integrations_bp.route("/send-email", methods=["POST"])
# Route délibérément ouverte : elle sert le formulaire de contact public.
# L'anti-relais plus bas force le destinataire, mais sujet et corps restent
# fournis par l'appelant — sans plafond, la boîte de l'église et le quota
# Resend étaient épuisables par n'importe qui.
@limiter.limit("3 per hour; 10 per day", exempt_when=_caller_is_staff)
def send_email():
    payload = request.get_json() or {}
    try:
        validated = SendEmailSchema(**payload)

        if len(validated.subject) > SUJET_MAX or len(validated.body) > CORPS_MAX:
            return error_response(
                f"Message trop long (sujet : {SUJET_MAX} caractères, "
                f"corps : {CORPS_MAX}).",
                code=400, status_code=400
            )

        # Try to parse sender name and email from body
        sender_nom = "Inconnu"
        sender_email = ""
        message_body = validated.body

        lines = validated.body.split('\n')
        for line in lines[:3]:
            if line.startswith("Nom:"):
                sender_nom = line.replace("Nom:", "").strip()
            elif line.startswith("Email:"):
                sender_email = line.replace("Email:", "").strip()

        parts = validated.body.split('\n\n', 1)
        if len(parts) > 1:
            message_body = parts[1]

        # Fetch church parameters via Supabase
        from extensions import get_supabase
        ep_res = get_supabase().table("eglise_parametres").select("nom, logo_url, email_contact").limit(1).execute()
        ep = ep_res.data[0] if ep_res.data else {}
        church_name = ep.get("nom") or "Rehoboth Church International"
        backend_url = request.host_url.rstrip('/')
        logo_url    = ep.get("logo_url") or f"{backend_url}/static/logo.jpeg"

        # Anti-relais : un appel non authentifié (formulaire de contact public)
        # ne peut envoyer qu'à l'adresse de contact de l'église, jamais à un
        # destinataire arbitraire.
        recipient = validated.to
        if not _caller_is_staff():
            recipient = (
                ep.get("email_contact")
                or os.getenv("CHURCH_CONTACT_EMAIL")
                or "contact@rehoboth.org"
            )

        from utils.email_templates import get_contact_email_html
        html_body = get_contact_email_html(
            church_name=church_name,
            logo_url=logo_url,
            sender_nom=sender_nom,
            sender_email=sender_email,
            message_body=message_body
        )

        EmailService.send_email(
            to=recipient,
            subject=validated.subject,
            body=validated.body,
            html=html_body
        )
        return success_response({"message": "Email sent successfully"})
    except ValidationError as e:
        return error_response(e.errors(), code=400, status_code=400)
