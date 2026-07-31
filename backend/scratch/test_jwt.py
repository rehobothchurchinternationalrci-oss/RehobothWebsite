import jwt as pyjwt
import datetime

secret = "your-supabase-jwt-secret-for-auth"
token_payload = {
    "sub": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
    "email": "admin@rehoboth.org",
    "role": "authenticated",
    "exp": datetime.datetime.utcnow() + datetime.timedelta(days=1)
}
token = pyjwt.encode(token_payload, secret, algorithm="HS256")
print("Encoded token type:", type(token))
print("Encoded token:", token)

try:
    payload = pyjwt.decode(
        token,
        secret,
        algorithms=["HS256"],
        options={"verify_aud": False}
    )
    print("Decoded payload:", payload)
except Exception as e:
    print("Decoding failed with exception:", type(e), str(e))
