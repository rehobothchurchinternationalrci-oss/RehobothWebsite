import sys
import os

sys.path.append(os.path.abspath(os.path.dirname(__file__) + "/.."))

from app import create_app
from extensions import db
from models.models import User, Membre, Departement, MembreDepartement, Role

app = create_app()
with app.app_context():
    try:
        print("Testing DB connection...")
        # Check roles pre-seeded
        roles = Role.query.all()
        print(f"Pre-seeded roles: {[r.id for r in roles]}")
        
        # Try to simulate create_department_with_chef
        print("Simulating department and chef insertion...")
        
        # 1. Create dept
        dept = Departement(
            nom="Département Test Model",
            description="Description test",
            type="cellule",
            jour_reunion="Dimanche",
            heure_reunion="10:00",
            lieu_reunion="Salle A",
            actif=True
        )
        db.session.add(dept)
        db.session.flush()
        print(f"Created department ID: {dept.id}")
        
        # 2. Create chef
        chef_email_lower = "testchef@mail.com"
        generated_password = "testchef12345"
        from werkzeug.security import generate_password_hash
        hashed_pass = generate_password_hash(generated_password)
        
        user = User(
            email=chef_email_lower,
            password_hash=hashed_pass,
            role="CHEF_DEPARTEMENT",
            is_active=True,
            email_verified=True,
            must_change_password=True
        )
        db.session.add(user)
        db.session.flush()
        print(f"Created User ID: {user.id}")
        
        chef_membre = Membre(
            user_id=user.id,
            prenom="ChefTest",
            nom="NomTest",
            email=chef_email_lower,
            statut="membre_actif"
        )
        db.session.add(chef_membre)
        db.session.flush()
        print(f"Created Membre ID: {chef_membre.id}")
        
        assoc = MembreDepartement(
            membre_id=chef_membre.id,
            departement_id=dept.id,
            est_chef=True
        )
        db.session.add(assoc)
        db.session.flush()
        print(f"Created MembreDepartement Association!")
        
        db.session.commit()
        print("Transaction committed successfully!")
        
    except Exception as e:
        db.session.rollback()
        print(f"FAILED to insert: {e}")
        import traceback
        traceback.print_exc()
