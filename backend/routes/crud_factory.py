from flask import Blueprint, request
from pydantic import ValidationError
from middlewares.auth import token_required
from middlewares.rbac import role_required
from utils.response import success_response, error_response


def create_crud_blueprint(name: str, url_prefix: str, service, schema,
                          public_read=False, write_roles=None, exclude_methods=None):
    """
    Factory de routes CRUD REST standard, validées par schéma Pydantic.

    - public_read=False (défaut) : GET protégés par token_required.
      Ne passer public_read=True que pour les ressources du site vitrine.
    - write_roles : rôles applicatifs autorisés à écrire (POST/PUT/DELETE).
      Si None, toute personne authentifiée peut écrire.
    """
    if exclude_methods is None:
        exclude_methods = []
    bp = Blueprint(name, __name__, url_prefix=url_prefix)

    def protect_read(fn):
        return fn if public_read else token_required(fn)

    def protect_write(fn):
        if write_roles:
            fn = role_required(*write_roles)(fn)
        return token_required(fn)

    @bp.route("", methods=["GET"], endpoint="list_records")
    @protect_read
    def list_records():
        order_by = request.args.get("order_by")
        filters = {}
        for k, v in request.args.items():
            if k not in ["order_by", "limit"]:
                # Cast booleans
                if v.lower() == "true":
                    v = True
                elif v.lower() == "false":
                    v = False
                filters[k] = v

        limit = request.args.get("limit", type=int)

        if filters:
            data = service.filter(filters, order_by=order_by, limit=limit)
        else:
            data = service.list(order_by=order_by, limit=limit)
        return success_response(data)

    @bp.route("/<id>", methods=["GET"], endpoint="get_record")
    @protect_read
    def get_record(id):
        record = service.get(id)
        if not record:
            return error_response("Record not found", code=404, status_code=404)
        return success_response(record)

    if "POST" not in exclude_methods:
        @bp.route("", methods=["POST"], endpoint="create_record")
        @protect_write
        def create_record():
            payload = request.get_json() or {}
            try:
                validated = schema(**payload)
                record = service.create(validated.model_dump(mode="json"))
                return success_response(record, status_code=201)
            except ValidationError as e:
                return error_response(e.errors(), code=400, status_code=400)

    if "PUT" not in exclude_methods:
        @bp.route("/<id>", methods=["PUT"], endpoint="update_record")
        @protect_write
        def update_record(id):
            payload = request.get_json() or {}
            try:
                validated = schema(**payload)
                record = service.update(id, validated.model_dump(mode="json"))
                return success_response(record)
            except ValidationError as e:
                return error_response(e.errors(), code=400, status_code=400)
            except ValueError as e:
                return error_response(str(e), code=404, status_code=404)

    if "DELETE" not in exclude_methods:
        @bp.route("/<id>", methods=["DELETE"], endpoint="delete_record")
        @protect_write
        def delete_record(id):
            try:
                success = service.delete(id)
                if not success:
                    return error_response("Record not found", code=404, status_code=404)
                return success_response({"id": id})
            except ValueError as e:
                return error_response(str(e), code=404, status_code=404)

    return bp
