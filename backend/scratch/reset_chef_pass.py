import sys
import os
from werkzeug.security import generate_password_hash

sys.path.append(os.path.abspath(os.path.dirname(__file__) + "/.."))

from app import create_app
from extensions import db
from models.models import User

app = create_app()
with app.app_context():
    try:
        email = "timotheenkwar16@gmail.com"
        user = User.query.filter_by(email=email).first()
        if not user:
            print("User not found.")
            sys.exit(1)
            
        user.password_hash = generate_password_hash("chef123")
        db.session.commit()
        print("Successfully updated password to 'chef123' for timotheenkwar16@gmail.com!")
    except Exception as e:
        db.session.rollback()
        print(f"Error: {e}")
