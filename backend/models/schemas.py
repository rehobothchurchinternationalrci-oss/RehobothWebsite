from pydantic import BaseModel, EmailStr, Field, HttpUrl, model_validator
from typing import Optional, List, Union, get_args, get_origin
from datetime import date, datetime


def _allows_none(annotation) -> bool:
    """Vrai si le champ est déclaré Optional[...] / Union[..., None]."""
    return get_origin(annotation) is Union and type(None) in get_args(annotation)


class BaseSchema(BaseModel):
    """
    Base commune à tous les schémas.

    Les formulaires HTML envoient "" pour un champ laissé vide, jamais null.
    Sans conversion, "" arrive tel quel sur un Optional[datetime] / Optional[date]
    / Optional[EmailStr] et Pydantic rejette la requête en 400 — l'utilisateur
    voit « Erreur lors de la sauvegarde » sans savoir quel champ est en cause.
    On ramène donc "" à None, mais uniquement sur les champs qui acceptent None :
    un champ obligatoire laissé vide doit continuer à échouer.
    """

    @model_validator(mode="before")
    @classmethod
    def _blank_to_none(cls, data):
        if not isinstance(data, dict):
            return data
        cleaned = dict(data)
        for name, field in cls.model_fields.items():
            if cleaned.get(name) == "" and _allows_none(field.annotation):
                cleaned[name] = None
        return cleaned


# 1. EgliseParametres
class EgliseParametresSchema(BaseSchema):
    nom: str
    adresse: Optional[str] = None
    ville: Optional[str] = None
    telephone: Optional[str] = None
    email_contact: Optional[str] = None
    site_web: Optional[str] = None
    facebook: Optional[str] = None
    youtube: Optional[str] = None
    instagram: Optional[str] = None
    horaires: Optional[str] = None
    description: Optional[str] = None
    vision: Optional[str] = None
    histoire: Optional[str] = None
    logo_url: Optional[str] = None

# 2. Membre
class MembreSchema(BaseSchema):
    prenom: str
    nom: str
    email: Optional[EmailStr] = None
    telephone: Optional[str] = None
    adresse: Optional[str] = None
    quartier: Optional[str] = None
    ville: Optional[str] = None
    pays: Optional[str] = None
    genre: Optional[str] = None
    date_naissance: Optional[date] = None
    statut: str = Field(..., pattern="^(membre_actif|membre_inactif|visiteur)$")
    date_adhesion: Optional[date] = None
    est_baptise: Optional[bool] = False
    date_bapteme: Optional[date] = None
    photo_url: Optional[str] = None
    notes: Optional[str] = None

# 3. Departement
class DepartementSchema(BaseSchema):
    nom: str
    description: Optional[str] = None
    type: str = Field(..., pattern="^(cellule|equipe_service|chorale|jeunesse|autre)$")
    responsable_id: Optional[str] = None
    jour_reunion: Optional[str] = None
    heure_reunion: Optional[str] = None
    lieu_reunion: Optional[str] = None
    actif: Optional[bool] = True
    chef_prenom: Optional[str] = None
    chef_nom: Optional[str] = None
    chef_email: Optional[EmailStr] = None

# 4. Evenement
class EvenementSchema(BaseSchema):
    titre: str
    description: Optional[str] = None
    date_debut: datetime
    date_fin: Optional[datetime] = None
    lieu: Optional[str] = None
    type: str = Field(..., pattern="^(culte|cellule|conference|jeunesse|concert|formation|autre)$")
    image_url: Optional[str] = None
    public: Optional[bool] = True

# 5. Presence
class PresenceSchema(BaseSchema):
    membre_id: str
    membre_nom: str
    evenement_id: str
    evenement_titre: str
    evenement_date: datetime
    present: bool

# 6. Don
class DonSchema(BaseSchema):
    membre_nom: Optional[str] = None
    montant: float = Field(..., ge=0)
    date: date
    type: str = Field(..., pattern="^(dime|offrande|don_special)$")
    anonyme: Optional[bool] = False
    note: Optional[str] = None

# 7. Predication
class PredicationSchema(BaseSchema):
    titre: str
    predicateur: str
    date: date
    serie: Optional[str] = None
    resume: Optional[str] = None
    fichier_url: Optional[str] = None
    youtube_url: Optional[str] = None
    publie: Optional[bool] = False

# 8. Communication
class CommunicationSchema(BaseSchema):
    sujet: str
    contenu: str
    destinataires_type: str = Field(..., pattern="^(tous_actifs|departement)$")
    departement_id: Optional[str] = None
    departement_nom: Optional[str] = None
    nb_destinataires: Optional[int] = 0

# Email Integration Send Schema
class SendEmailSchema(BaseSchema):
    to: str
    subject: str
    body: str

# MembreDepartement
class MembreDepartementSchema(BaseSchema):
    membre_id: str
    departement_id: str
