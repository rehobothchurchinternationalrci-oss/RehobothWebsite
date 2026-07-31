from flask import jsonify

def api_response(success=True, data=None, error=None, status_code=200):
    """
    Standard JSON Response Envelope for the entire API.
    Format:
    {
      "success": true/false,
      "data": {}/[]/null,
      "error": { "message": "...", "code": ... } / null
    }
    """
    response = {
        "success": success,
        "data": data,
        "error": error
    }
    return jsonify(response), status_code

def success_response(data=None, status_code=200):
    return api_response(success=True, data=data, error=None, status_code=status_code)

def error_response(message, code=400, status_code=400):
    error_payload = {
        "message": message,
        "code": code
    }
    return api_response(success=False, data=None, error=error_payload, status_code=status_code)
