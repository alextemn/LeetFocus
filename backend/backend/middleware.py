import os

import jwt
import requests
from django.core.cache import cache
from jwt.algorithms import RSAAlgorithm
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed

CLERK_FRONTEND_API_URL = os.environ.get("CLERK_API_FRONTEND_URL", "")
CACHE_KEY = "jwks_data"


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
        jwks_data = self._get_jwks()
        public_key = RSAAlgorithm.from_jwk(jwks_data["keys"][0])
        try:
            return jwt.decode(
                token,
                public_key,
                algorithms=["RS256"],
                options={"verify_signature": True},
            )
        except jwt.ExpiredSignatureError:
            raise AuthenticationFailed("Token has expired.")
        except jwt.DecodeError:
            raise AuthenticationFailed("Token decode error.")
        except jwt.InvalidTokenError:
            raise AuthenticationFailed("Invalid token.")

    def _get_jwks(self):
        jwks_data = cache.get(CACHE_KEY)
        if not jwks_data:
            response = requests.get(f"{CLERK_FRONTEND_API_URL}/.well-known/jwks.json")
            if response.status_code != 200:
                raise AuthenticationFailed("Failed to fetch JWKS.")
            jwks_data = response.json()
            cache.set(CACHE_KEY, jwks_data)
        return jwks_data
