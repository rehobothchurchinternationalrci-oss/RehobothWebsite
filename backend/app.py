import os
from flask import Flask, jsonify
from flask_cors import CORS
from config.settings import Config
from routes import register_blueprints
from utils.response import error_response


def create_app(test_config=None):
    app = Flask(__name__)
    CORS(app, resources={r"/api/*": {"origins": "*"}})

    if test_config:
        app.config.update(test_config)
    else:
        app.config.from_object(Config)
        if not app.config.get("TESTING"):
            Config.validate()

    register_blueprints(app)

    @app.route("/api/health", methods=["GET"])
    def health_check():
        return jsonify({"status": "healthy", "environment": Config.FLASK_ENV}), 200

    @app.errorhandler(404)
    def not_found(e):
        return error_response("Endpoint ou ressource introuvable", code=404, status_code=404)

    @app.errorhandler(500)
    def server_error(e):
        app.logger.error(f"Erreur serveur : {str(e)}")
        return error_response("Erreur serveur inattendue", code=500, status_code=500)

    return app


app = create_app()

if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=Config.DEBUG)
