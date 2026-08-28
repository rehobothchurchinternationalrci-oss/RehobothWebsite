import uuid
from datetime import datetime, date
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.types import TypeDecorator, String
from extensions import db

# Safe Dialect Types for testing (SQLite fallback support)
class SafeJSONB(TypeDecorator):
    impl = db.JSON
    cache_ok = True
    def load_dialect_impl(self, dialect):
        if dialect.name == 'postgresql':
            from sqlalchemy.dialects.postgresql import JSONB
            return dialect.type_descriptor(JSONB())
        else:
            return dialect.type_descriptor(db.JSON())

class SafeINET(TypeDecorator):
    impl = String
    cache_ok = True
    def load_dialect_impl(self, dialect):
        if dialect.name == 'postgresql':
            from sqlalchemy.dialects.postgresql import INET
            return dialect.type_descriptor(INET())
        else:
            return dialect.type_descriptor(String(45))

# ============================================================
# MODÈLE : Role
# ============================================================
class Role(db.Model):
    __tablename__ = 'roles'

    id = db.Column(db.String(50), primary_key=True)
    name = db.Column(db.String(100), nullable=False)

    def __init__(self, **kwargs):
        super().__init__(**kwargs)

# ============================================================
# MODÈLE : User
# ============================================================
class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(50), db.ForeignKey('roles.id', ondelete='RESTRICT'), nullable=False, default='MEMBRE', index=True)
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    email_verified = db.Column(db.Boolean, nullable=False, default=False)
    must_change_password = db.Column(db.Boolean, nullable=False, default=False, server_default='false')
    last_login = db.Column(db.DateTime(timezone=True))
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime(timezone=True), nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    membre = db.relationship('Membre', backref='user', uselist=False, cascade="all, delete-orphan")

    def __init__(self, **kwargs):
        super().__init__(**kwargs)


# ============================================================
# MODÈLE : EgliseParametres
# ============================================================
class EgliseParametres(db.Model):
    __tablename__ = 'eglise_parametres'

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    nom = db.Column(db.Text, nullable=False)
    adresse = db.Column(db.Text)
    ville = db.Column(db.Text)
    telephone = db.Column(db.Text)
    email_contact = db.Column(db.Text)
    site_web = db.Column(db.Text)
    facebook = db.Column(db.Text)
    youtube = db.Column(db.Text)
    instagram = db.Column(db.Text)
    horaires = db.Column(db.Text)
    description = db.Column(db.Text)
    vision = db.Column(db.Text)
    histoire = db.Column(db.Text)
    logo_url = db.Column(db.Text)
    created_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow)
    updated_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

# ============================================================
# MODÈLE : Membre
# ============================================================
class Membre(db.Model):
    __tablename__ = 'membres'

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = db.Column(UUID(as_uuid=True), db.ForeignKey('users.id', ondelete='SET NULL'), unique=True, index=True)
    prenom = db.Column(db.Text, nullable=False)
    nom = db.Column(db.Text, nullable=False, index=True)
    email = db.Column(db.Text, unique=True)
    telephone = db.Column(db.Text)
    adresse = db.Column(db.Text)
    quartier = db.Column(db.Text)
    ville = db.Column(db.Text)
    pays = db.Column(db.Text, default='Chypre')
    genre = db.Column(db.Text)
    date_naissance = db.Column(db.Date)
    statut = db.Column(db.Text, nullable=False, default='membre_actif')
    date_adhesion = db.Column(db.Date)
    est_baptise = db.Column(db.Boolean, default=False)
    date_bapteme = db.Column(db.Date)
    photo_url = db.Column(db.Text)
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow)
    updated_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

# ============================================================
# MODÈLE : Departement
# ============================================================
class Departement(db.Model):
    __tablename__ = 'departements'

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    nom = db.Column(db.Text, nullable=False)
    description = db.Column(db.Text)
    type = db.Column(db.Text)
    responsable_id = db.Column(UUID(as_uuid=True), db.ForeignKey('users.id', ondelete='SET NULL'))
    jour_reunion = db.Column(db.Text)
    heure_reunion = db.Column(db.Text)
    lieu_reunion = db.Column(db.Text)
    couleur = db.Column(db.Text, default='#1A3060')
    icone = db.Column(db.Text)
    actif = db.Column(db.Boolean, default=True)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow)
    updated_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

# ============================================================
# MODÈLE : MembreDepartement
# ============================================================
class MembreDepartement(db.Model):
    __tablename__ = 'membre_departements'

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    membre_id = db.Column(UUID(as_uuid=True), db.ForeignKey('membres.id', ondelete='CASCADE'), nullable=False, index=True)
    departement_id = db.Column(UUID(as_uuid=True), db.ForeignKey('departements.id', ondelete='CASCADE'), nullable=False, index=True)
    date_entree = db.Column(db.Date, default=date.today)
    date_sortie = db.Column(db.Date)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow)

    __table_args__ = (db.UniqueConstraint('membre_id', 'departement_id', name='_membre_dept_uc'),)

# ============================================================
# MODÈLE : ChefDepartement
# ============================================================
class ChefDepartement(db.Model):
    __tablename__ = 'chef_departement'

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = db.Column(UUID(as_uuid=True), db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    departement_id = db.Column(UUID(as_uuid=True), db.ForeignKey('departements.id', ondelete='CASCADE'), nullable=False)
    date_debut = db.Column(db.Date, default=date.today)
    date_fin = db.Column(db.Date)
    is_actif = db.Column(db.Boolean, nullable=False, default=True)

    # Un seul chef ACTIF par département, mais un chef peut en diriger
    # plusieurs. L'index partiel laisse coexister les anciens chefs
    # (is_actif = False) pour conserver l'historique des passations.
    __table_args__ = (
        db.UniqueConstraint('user_id', 'departement_id', name='_user_dept_uc'),
        db.Index(
            'uq_chef_departement_actif',
            'departement_id',
            unique=True,
            postgresql_where=db.text('is_actif'),
        ),
    )

# ============================================================
# MODÈLE : ReunionDepartement
# ============================================================
class ReunionDepartement(db.Model):
    __tablename__ = 'reunions_departement'

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    departement_id = db.Column(UUID(as_uuid=True), db.ForeignKey('departements.id', ondelete='CASCADE'), nullable=False)
    titre = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text)
    date_reunion = db.Column(db.DateTime(timezone=True), nullable=False)
    lieu = db.Column(db.String(255))
    is_en_ligne = db.Column(db.Boolean, default=False)
    lien_reunion = db.Column(db.Text)
    created_by = db.Column(UUID(as_uuid=True), db.ForeignKey('users.id', ondelete='SET NULL'))
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=datetime.utcnow)

# ============================================================
# MODÈLE : Evenement
# ============================================================
class Evenement(db.Model):
    __tablename__ = 'evenements'

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    titre = db.Column(db.Text, nullable=False)
    description = db.Column(db.Text)
    date_debut = db.Column(db.DateTime(timezone=True), nullable=False, index=True)
    date_fin = db.Column(db.DateTime(timezone=True))
    lieu = db.Column(db.Text)
    type = db.Column(db.Text, nullable=False)
    image_url = db.Column(db.Text)
    public = db.Column(db.Boolean, default=True)
    est_public = db.Column(db.Boolean, default=True)
    departement_id = db.Column(UUID(as_uuid=True), db.ForeignKey('departements.id', ondelete='SET NULL'))
    couleur = db.Column(db.Text, default='#1A3060')
    cree_par = db.Column(UUID(as_uuid=True), db.ForeignKey('users.id', ondelete='SET NULL'))
    created_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow)
    updated_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

# ============================================================
# MODÈLE : Presence (Événements)
# ============================================================
class Presence(db.Model):
    __tablename__ = 'presences'

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    membre_id = db.Column(UUID(as_uuid=True), db.ForeignKey('membres.id', ondelete='CASCADE'), nullable=False)
    membre_nom = db.Column(db.Text, nullable=False)
    evenement_id = db.Column(UUID(as_uuid=True), db.ForeignKey('evenements.id', ondelete='CASCADE'), nullable=False)
    evenement_titre = db.Column(db.Text, nullable=False)
    evenement_date = db.Column(db.DateTime(timezone=True), nullable=False)
    present = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow)

    __table_args__ = (db.UniqueConstraint('membre_id', 'evenement_id', name='_membre_evenement_uc'),)

# ============================================================
# MODÈLE : PresenceReunion (Réunions département)
# ============================================================
class PresenceReunion(db.Model):
    __tablename__ = 'presences_reunion'

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    reunion_id = db.Column(UUID(as_uuid=True), db.ForeignKey('reunions_departement.id', ondelete='CASCADE'), nullable=False)
    membre_id = db.Column(UUID(as_uuid=True), db.ForeignKey('membres.id', ondelete='CASCADE'), nullable=False)
    statut = db.Column(db.Enum('PRESENT', 'ABSENT', 'EXCUSE', name='presence_status'), nullable=False, default='ABSENT')
    note = db.Column(db.Text)
    enregistre_par = db.Column(UUID(as_uuid=True), db.ForeignKey('users.id', ondelete='SET NULL'))

    __table_args__ = (db.UniqueConstraint('reunion_id', 'membre_id', name='_reunion_membre_uc'),)

# ============================================================
# MODÈLE : RendezVous
# ============================================================
class RendezVous(db.Model):
    __tablename__ = 'rendez_vous'

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    membre_id = db.Column(UUID(as_uuid=True), db.ForeignKey('membres.id', ondelete='SET NULL'))
    nom_demandeur = db.Column(db.String(200))
    email_demandeur = db.Column(db.String(255))
    telephone_demandeur = db.Column(db.String(30))
    motif = db.Column(db.Text, nullable=False)
    date_souhaitee = db.Column(db.DateTime(timezone=True))
    date_confirmee = db.Column(db.DateTime(timezone=True), index=True)
    duree_minutes = db.Column(db.Integer, default=30)
    lieu = db.Column(db.String(255))
    statut = db.Column(db.Enum('EN_ATTENTE', 'APPROUVE', 'REFUSE', 'ANNULE', 'TERMINE', name='rdv_status'), nullable=False, default='EN_ATTENTE', index=True)
    note_pasteur = db.Column(db.Text)
    cree_par = db.Column(UUID(as_uuid=True), db.ForeignKey('users.id', ondelete='SET NULL'))
    approuve_par = db.Column(UUID(as_uuid=True), db.ForeignKey('users.id', ondelete='SET NULL'))
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime(timezone=True), nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

# ============================================================
# MODÈLE : Annonce
# ============================================================
class Annonce(db.Model):
    __tablename__ = 'annonces'

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    titre = db.Column(db.String(255), nullable=False)
    contenu = db.Column(db.Text, nullable=False)
    image_url = db.Column(db.Text)
    est_publique = db.Column(db.Boolean, default=True, index=True)
    departement_id = db.Column(UUID(as_uuid=True), db.ForeignKey('departements.id', ondelete='SET NULL'))
    date_publication = db.Column(db.DateTime(timezone=True), default=datetime.utcnow)
    date_expiration = db.Column(db.DateTime(timezone=True))
    publie_par = db.Column(UUID(as_uuid=True), db.ForeignKey('users.id', ondelete='SET NULL'))
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=datetime.utcnow)

# ============================================================
# MODÈLE : Finance (Livre comptable)
# ============================================================
class Finance(db.Model):
    __tablename__ = 'finances'

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    type = db.Column(db.Enum('DIME', 'OFFRANDE', 'DON', 'AUTRE', name='transaction_type'), nullable=False)
    montant = db.Column(db.Numeric(12, 2), nullable=False)
    devise = db.Column(db.String(3), default='EUR')
    membre_id = db.Column(UUID(as_uuid=True), db.ForeignKey('membres.id', ondelete='SET NULL'))
    est_anonyme = db.Column(db.Boolean, default=False)
    date_transaction = db.Column(db.Date, nullable=False, default=date.today, index=True)
    description = db.Column(db.Text)
    recu_par = db.Column(UUID(as_uuid=True), db.ForeignKey('users.id', ondelete='SET NULL'))
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=datetime.utcnow)

# ============================================================
# MODÈLE : Predication
# ============================================================
class Predication(db.Model):
    __tablename__ = 'predications'

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    titre = db.Column(db.Text, nullable=False)
    predicateur = db.Column(db.Text, nullable=False)
    date = db.Column(db.Date, nullable=False)
    serie = db.Column(db.Text)
    resume = db.Column(db.Text)
    fichier_url = db.Column(db.Text)
    youtube_url = db.Column(db.Text)
    publie = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow)
    updated_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

# ============================================================
# MODÈLE : Media
# ============================================================
class Media(db.Model):
    __tablename__ = 'medias'

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    titre = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text)
    type = db.Column(db.Enum('PREDICATION', 'TEMOIGNAGE', 'CULTE', 'EVENEMENT', 'AUTRE', name='media_type'), nullable=False, default='PREDICATION', index=True)
    youtube_url = db.Column(db.Text)
    fichier_url = db.Column(db.Text)
    thumbnail_url = db.Column(db.Text)
    intervenant = db.Column(db.String(200))
    date_enregistrement = db.Column(db.Date)
    duree_secondes = db.Column(db.Integer)
    est_public = db.Column(db.Boolean, default=True)
    publie_par = db.Column(UUID(as_uuid=True), db.ForeignKey('users.id', ondelete='SET NULL'))
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime(timezone=True), nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

# ============================================================
# MODÈLE : Galerie
# ============================================================
class Galerie(db.Model):
    __tablename__ = 'galerie'

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    titre = db.Column(db.String(255))
    description = db.Column(db.Text)
    fichier_url = db.Column(db.Text, nullable=False)
    type_fichier = db.Column(db.String(10), default='image')
    evenement = db.Column(db.String(255))
    date_prise = db.Column(db.Date)
    est_public = db.Column(db.Boolean, default=True)
    ajoutee_par = db.Column(UUID(as_uuid=True), db.ForeignKey('users.id', ondelete='SET NULL'))
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=datetime.utcnow)

# ============================================================
# MODÈLE : Session
# ============================================================
class Session(db.Model):
    __tablename__ = 'sessions'

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    type = db.Column(db.Enum('BAPTEME', 'AFFERMISSEMENT', 'FORMATION', 'EVANGELISATION', name='session_type'), nullable=False)
    titre = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text)
    date_debut = db.Column(db.DateTime(timezone=True), nullable=False)
    date_fin = db.Column(db.DateTime(timezone=True))
    lieu = db.Column(db.String(255))
    places_max = db.Column(db.Integer)
    responsable_id = db.Column(UUID(as_uuid=True), db.ForeignKey('users.id', ondelete='SET NULL'))
    est_ouvert = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=datetime.utcnow)

# ============================================================
# MODÈLE : InscriptionSession
# ============================================================
class InscriptionSession(db.Model):
    __tablename__ = 'inscriptions_sessions'

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = db.Column(UUID(as_uuid=True), db.ForeignKey('sessions.id', ondelete='CASCADE'), nullable=False)
    membre_id = db.Column(UUID(as_uuid=True), db.ForeignKey('membres.id', ondelete='SET NULL'))
    nom_prenom = db.Column(db.String(200))
    email = db.Column(db.String(255))
    telephone = db.Column(db.String(30))
    statut = db.Column(db.Enum('INSCRIT', 'CONFIRME', 'ANNULE', 'PRESENT', name='inscription_status'), nullable=False, default='INSCRIT')
    note = db.Column(db.Text)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=datetime.utcnow)

# ============================================================
# MODÈLE : RapportDepartement
# ============================================================
class RapportDepartement(db.Model):
    __tablename__ = 'rapports_departement'

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    departement_id = db.Column(UUID(as_uuid=True), db.ForeignKey('departements.id', ondelete='CASCADE'), nullable=False)
    mois = db.Column(db.Integer, nullable=False)
    annee = db.Column(db.Integer, nullable=False)
    contenu = db.Column(db.Text, nullable=False)
    nb_membres = db.Column(db.Integer)
    nb_reunions = db.Column(db.Integer)
    soumis_par = db.Column(UUID(as_uuid=True), db.ForeignKey('users.id', ondelete='SET NULL'))
    soumis_le = db.Column(db.DateTime(timezone=True), default=datetime.utcnow)

    __table_args__ = (db.UniqueConstraint('departement_id', 'mois', 'annee', name='_dept_period_uc'),)

# ============================================================
# MODÈLE : Communication
# ============================================================
class Communication(db.Model):
    __tablename__ = 'communications'

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    sujet = db.Column(db.Text, nullable=False)
    contenu = db.Column(db.Text, nullable=False)
    destinataires_type = db.Column(db.Text, nullable=False)
    departement_id = db.Column(UUID(as_uuid=True), db.ForeignKey('departements.id', ondelete='SET NULL'))
    departement_nom = db.Column(db.Text)
    nb_destinataires = db.Column(db.Integer, default=0)
    envoye_at = db.Column(db.DateTime(timezone=True))
    statut = db.Column(db.Text, default='envoye')
    created_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow)

# ============================================================
# MODÈLE : Message
# ============================================================
class Message(db.Model):
    __tablename__ = 'messages'

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    expediteur_id = db.Column(UUID(as_uuid=True), db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    destinataire_id = db.Column(UUID(as_uuid=True), db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    sujet = db.Column(db.String(255))
    contenu = db.Column(db.Text, nullable=False)
    statut = db.Column(db.Enum('NON_LU', 'LU', 'ARCHIVE', name='message_status'), nullable=False, default='NON_LU')
    parent_id = db.Column(UUID(as_uuid=True), db.ForeignKey('messages.id', ondelete='SET NULL'))
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=datetime.utcnow)

# ============================================================
# MODÈLE : Notification
# ============================================================
class Notification(db.Model):
    __tablename__ = 'notifications'

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = db.Column(UUID(as_uuid=True), db.ForeignKey('users.id', ondelete='CASCADE'), index=True)
    type = db.Column(db.Enum('EMAIL', 'INTERNE', 'SMS', name='notification_type'), nullable=False, default='INTERNE')
    titre = db.Column(db.String(255), nullable=False)
    contenu = db.Column(db.Text, nullable=False)
    lien = db.Column(db.Text)
    est_lu = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=datetime.utcnow)

# ============================================================
# MODÈLE : Document
# ============================================================
class Document(db.Model):
    __tablename__ = 'documents'

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    nom = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text)
    fichier_url = db.Column(db.Text, nullable=False)
    type_mime = db.Column(db.String(100))
    taille_bytes = db.Column(db.BigInteger)
    est_public = db.Column(db.Boolean, default=False)
    departement_id = db.Column(UUID(as_uuid=True), db.ForeignKey('departements.id', ondelete='SET NULL'))
    uploade_par = db.Column(UUID(as_uuid=True), db.ForeignKey('users.id', ondelete='SET NULL'))
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=datetime.utcnow)

# ============================================================
# MODÈLE : AuditLog
# ============================================================
class AuditLog(db.Model):
    __tablename__ = 'audit_logs'

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = db.Column(UUID(as_uuid=True), db.ForeignKey('users.id', ondelete='SET NULL'), index=True)
    action = db.Column(db.String(100), nullable=False)
    table_cible = db.Column(db.String(100))
    record_id = db.Column(UUID(as_uuid=True))
    details = db.Column(SafeJSONB)
    ip_address = db.Column(SafeINET)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=datetime.utcnow, index=True)

# ============================================================
# MODÈLE : ParametresSysteme
# ============================================================
class ParametresSysteme(db.Model):
    __tablename__ = 'parametres_systeme'

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    cle = db.Column(db.String(100), unique=True, nullable=False)
    valeur = db.Column(db.Text)
    description = db.Column(db.Text)
    updated_by = db.Column(UUID(as_uuid=True), db.ForeignKey('users.id', ondelete='SET NULL'))
    updated_at = db.Column(db.DateTime(timezone=True), nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

# ============================================================
# MODÈLE : PasswordResetToken
# ============================================================
class PasswordResetToken(db.Model):
    __tablename__ = 'password_reset_tokens'

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = db.Column(UUID(as_uuid=True), db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    token = db.Column(db.String(255), unique=True, nullable=False)
    expires_at = db.Column(db.DateTime(timezone=True), nullable=False)
    used = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=datetime.utcnow)
