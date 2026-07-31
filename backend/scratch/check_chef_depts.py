import sys
import os

sys.path.append(os.path.abspath(os.path.dirname(__file__) + "/.."))

from app import create_app
from extensions import db
from models.models import User, Membre, Departement, MembreDepartement

app = create_app()
with app.app_context():
    try:
        email = "timotheenkwar16@gmail.com"
        user = User.query.filter_by(email=email).first()
        if not user:
            print(f"User with email '{email}' not found")
        else:
            print(f"User: id={user.id}, email={user.email}, role={user.role}")
            membre = Membre.query.filter_by(email=email).first()
            if not membre:
                print(f"Member with email '{email}' not found")
            else:
                print(f"Member: id={membre.id}, user_id={membre.user_id}, name={membre.prenom} {membre.nom}")
                assocs = MembreDepartement.query.filter_by(membre_id=membre.id).all()
                print(f"Total department associations for member: {len(assocs)}")
                for a in assocs:
                    dept = Departement.query.get(a.departement_id)
                    print(f"  - Dept: {dept.nom} (id={dept.id}), est_chef={a.est_chef}")
    except Exception as e:
        print(f"Error: {e}")
