from routes.crud_factory import create_crud_blueprint
from routes.integrations import integrations_bp
from routes.auth_routes import auth_bp
from routes.departement_workspace_routes import dept_ws_bp
from services.base_service import BaseService
from middlewares.rbac import ADMIN_ROLES, DEPT_ROLES, EVENT_ROLES, MEDIA_ROLES, SETTINGS_ROLES
from models.schemas import (
    MembreSchema,
    DepartementSchema,
    EvenementSchema,
    PresenceSchema,
    DonSchema,
    PredicationSchema,
    EgliseParametresSchema,
    MembreDepartementSchema,
    CommunicationSchema
)

# Initialize CRUD services
member_service = BaseService("membres")
department_service = BaseService("departements")
event_service = BaseService("evenements")
presence_service = BaseService("presences")
donation_service = BaseService("dons")
sermon_service = BaseService("predications")
settings_service = BaseService("eglise_parametres")
member_department_service = BaseService("membre_departements")
communication_service = BaseService("communications")

# Create Blueprints
# public_read : uniquement les ressources affichées sur le site vitrine.
# write_roles : rôles autorisés à écrire, alignés sur les matrices du frontend.
membres_bp = create_crud_blueprint(
    name="membres",
    url_prefix="/api/membres",
    service=member_service,
    schema=MembreSchema,
    write_roles=ADMIN_ROLES
)

departements_bp = create_crud_blueprint(
    name="departements",
    url_prefix="/api/departements",
    service=department_service,
    schema=DepartementSchema,
    public_read=True,
    write_roles=ADMIN_ROLES,
    # POST et PUT sont pris en charge par departement_workspace_routes : le
    # formulaire envoie des champs chef_* qui ne sont pas des colonnes de la
    # table et demandent un traitement dédié (création du compte du chef).
    exclude_methods=["POST", "PUT"]
)

evenements_bp = create_crud_blueprint(
    name="evenements",
    url_prefix="/api/evenements",
    service=event_service,
    schema=EvenementSchema,
    public_read=True,
    write_roles=EVENT_ROLES
)

presences_bp = create_crud_blueprint(
    name="presences",
    url_prefix="/api/presences",
    service=presence_service,
    schema=PresenceSchema,
    write_roles=DEPT_ROLES
)

dons_bp = create_crud_blueprint(
    name="dons",
    url_prefix="/api/dons",
    service=donation_service,
    schema=DonSchema,
    write_roles=ADMIN_ROLES
)

predications_bp = create_crud_blueprint(
    name="predications",
    url_prefix="/api/predications",
    service=sermon_service,
    schema=PredicationSchema,
    public_read=True,
    write_roles=MEDIA_ROLES
)

parametres_bp = create_crud_blueprint(
    name="eglise-parametres",
    url_prefix="/api/eglise-parametres",
    service=settings_service,
    schema=EgliseParametresSchema,
    public_read=True,
    write_roles=SETTINGS_ROLES
)

membre_departements_bp = create_crud_blueprint(
    name="membre-departements",
    url_prefix="/api/membre-departements",
    service=member_department_service,
    schema=MembreDepartementSchema,
    write_roles=DEPT_ROLES
)

communications_bp = create_crud_blueprint(
    name="communications",
    url_prefix="/api/communications",
    service=communication_service,
    schema=CommunicationSchema,
    write_roles=DEPT_ROLES
)

def register_blueprints(app):
    """Register all routes/blueprints on the Flask app context."""
    app.register_blueprint(membres_bp)
    app.register_blueprint(departements_bp)
    app.register_blueprint(dept_ws_bp)
    app.register_blueprint(evenements_bp)
    app.register_blueprint(presences_bp)
    app.register_blueprint(dons_bp)
    app.register_blueprint(predications_bp)
    app.register_blueprint(parametres_bp)
    app.register_blueprint(membre_departements_bp)
    app.register_blueprint(communications_bp)
    app.register_blueprint(integrations_bp)
    app.register_blueprint(auth_bp)
