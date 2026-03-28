import os

import jwt
from jwt import PyJWKClient
from jwt.exceptions import PyJWKClientError
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed

_jwks_client = None


def _get_jwks_client():
    global _jwks_client
    if _jwks_client is None:
        clerk_api_url = os.environ.get("CLERK_API_FRONTEND_URL", "").rstrip("/")
        if not clerk_api_url:
            raise AuthenticationFailed("CLERK_API_FRONTEND_URL is not configured.")
        jwks_url = f"{clerk_api_url}/.well-known/jwks.json"
        _jwks_client = PyJWKClient(jwks_url, cache_keys=True)
    return _jwks_client


class ClerkUser:
    """Lightweight user object populated from the Clerk JWT — no DB writes."""
    is_authenticated = True

    def __init__(self, clerk_id, email=""):
        self.username = clerk_id
        self.email = email


class JWTAuthenticationMiddleware(BaseAuthentication):
    def authenticate(self, request):
        auth_header = request.headers.get("Authorization")
        if not auth_header:
            return None
        try:
            token = auth_header.split(" ")[1]
        except IndexError:
            raise AuthenticationFailed("Bearer token not provided.")

        payload = self._decode_jwt(token)
        clerk_id = payload.get("sub")
        if not clerk_id:
            raise AuthenticationFailed("Token missing sub claim.")

        email = payload.get("email", "")
        return ClerkUser(clerk_id, email), None

    def _decode_jwt(self, token):
        try:
            client = _get_jwks_client()
            signing_key = client.get_signing_key_from_jwt(token)
            return jwt.decode(
                token,
                signing_key.key,
                algorithms=["RS256"],
                options={"require": ["sub", "exp"]},
            )
        except jwt.ExpiredSignatureError:
            raise AuthenticationFailed("Token has expired.")
        except jwt.DecodeError:
            raise AuthenticationFailed("Token decode error.")
        except jwt.InvalidTokenError as exc:
            raise AuthenticationFailed(f"Invalid token: {exc}")
        except PyJWKClientError as exc:
            raise AuthenticationFailed(f"Could not fetch signing key: {exc}")
        except Exception as exc:
            raise AuthenticationFailed(f"Authentication error: {exc}")
