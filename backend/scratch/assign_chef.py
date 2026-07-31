import sys
import os

sys.path.append(os.path.abspath(os.path.dirname(__file__) + "/.."))

from app import create_app
from extensions import db
from models.models import User, Membre, Departement, MembreDepartement
from sqlalchemy import text

app = create_app()
with app.app_context():
    try:
        email = "timotheenkwar16@gmail.com"
        dept_name = "Département Test Model"
        
        # 1. Find user & member
        user = User.query.filter_by(email=email).first()
        membre = Membre.query.filter_by(email=email).first()
        dept = Departement.query.filter_by(nom=dept_name).first()
        
        if not user or not membre or not dept:
            print("Could not find user, member, or department.")
            sys.exit(1)
            
        print(f"Found User ID: {user.id}, Member ID: {membre.id}, Dept ID: {dept.id}")
        
        # 2. Reset other chef roles in this department
        db.session.execute(
            text("UPDATE membre_departements SET est_chef = FALSE WHERE departement_id = :dept_id"),
            {"dept_id": dept.id}
        )
        
        # 3. Add or update association
        assoc = MembreDepartement.query.filter_by(membre_id=membre.id, departement_id=dept.id).first()
        if assoc:
            assoc.est_chef = True
        else:
            assoc = MembreDepartement(
                membre_id=membre.id,
                departement_id=dept.id,
                est_chef=True
            )
            db.session.add(assoc)
            
        # 4. Set department responsable name
        dept.responsable_nom = f"{membre.prenom} {membre.nom}"
        
        # Ensure user role is CHEF_DEPARTEMENT
        user.role = "CHEF_DEPARTEMENT"
        
        db.session.commit()
        print(f"Successfully set {membre.prenom} {membre.nom} as chef of '{dept.nom}'!")
        
    except Exception as e:
        db.session.rollback()
        print(f"Error setting chef: {e}")
