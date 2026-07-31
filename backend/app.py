import os
import time
from flask import Flask, jsonify
from flask_cors import CORS
from config.settings import Config
from repositories.supabase_repository import get_supabase_client
from routes import register_blueprints
from utils.response import error_response


def create_app(test_config=None):
    app = Flask(__name__)
    CORS(app, resources={r"/api/*": {"origins": Config.CORS_ORIGINS}})

    if test_config:
        app.config.update(test_config)
    else:
        app.config.from_object(Config)
        if not app.config.get("TESTING"):
            # Une config incomplete ne doit pas tuer le process : sinon les workers
            # gunicorn meurent au boot et la plateforme ne renvoie que des 502, sans
            # indice sur la cause. On demarre en mode degrade et /api/health/ready
            # dit precisement ce qui manque.
            try:
                Config.validate()
            except ValueError as e:
                app.logger.error(f"Configuration incomplete au demarrage : {e}")

    register_blueprints(app)

    @app.route("/api/health", methods=["GET"])
    def health_check():
        """Liveness : le process Flask repond. Utilise par le healthcheck Railway,
        volontairement sans dependance externe pour ne pas faire echouer un
        deploiement quand Supabase est momentanement indisponible."""
        return jsonify({"status": "healthy", "environment": Config.FLASK_ENV}), 200

    @app.route("/api/health/ready", methods=["GET"])
    def readiness_check():
        """Readiness : verifie que la config est complete et que Supabase repond."""
        checks = {"config": {"status": "ok"}, "supabase": {"status": "ok"}}
        status_code = 200

        try:
            Config.validate()
        except ValueError as e:
            checks["config"] = {"status": "error", "detail": str(e)}
            checks["supabase"] = {"status": "skipped"}
            return jsonify({
                "status": "unhealthy",
                "environment": Config.FLASK_ENV,
                "checks": checks,
            }), 503

        try:
            start = time.perf_counter()
            get_supabase_client().table("eglise_parametres").select("id").limit(1).execute()
            checks["supabase"]["latency_ms"] = round((time.perf_counter() - start) * 1000, 1)
        except Exception as e:
            app.logger.error(f"Readiness : Supabase injoignable : {e}")
            checks["supabase"] = {"status": "error", "detail": str(e)}
            status_code = 503

        healthy = status_code == 200
        return jsonify({
            "status": "healthy" if healthy else "unhealthy",
            "environment": Config.FLASK_ENV,
            "checks": checks,
        }), status_code

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
