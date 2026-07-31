import sys
from app import app
from extensions import db
from models.models import Departement

with app.app_context():
    depts = Departement.query.all()
    print(f"Found {len(depts)} departments:")
    for d in depts:
        print(f"ID: {d.id}, Nom: {d.nom}")
    
    if depts:
        target = depts[0]
        print(f"\nTrying to delete department: {target.nom} ({target.id})...")
        try:
            db.session.delete(target)
            db.session.commit()
            print("Successfully deleted!")
        except Exception as e:
            print("\nERROR DELETING:", type(e), str(e))
            db.session.rollback()
