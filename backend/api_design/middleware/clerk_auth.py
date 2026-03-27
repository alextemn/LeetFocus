import jwt
from jwt import PyJWKClient
from django.conf import settings
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed


def _get_jwks_client():
    jwks_url = getattr(settings, 'CLERK_JWKS_URL', None)
    if not jwks_url:
        raise AuthenticationFailed('CLERK_JWKS_URL is not configured.')
    return PyJWKClient(jwks_url)


class ClerkAuthentication(BaseAuthentication):
    """
    DRF authentication class that validates Clerk-issued JWTs.

    Expects:  Authorization: Bearer <token>

    On success sets request.user to the Clerk user ID (the JWT `sub` claim).
    """

    def authenticate(self, request):
        auth_header = request.META.get('HTTP_AUTHORIZATION', '')
        if not auth_header.startswith('Bearer '):
            return None

        token = auth_header.split(' ', 1)[1].strip()
        if not token:
            return None

        try:
            jwks_client = _get_jwks_client()
            signing_key = jwks_client.get_signing_key_from_jwt(token)
            payload = jwt.decode(
                token,
                signing_key.key,
                algorithms=['RS256'],
                options={'require': ['sub', 'exp']},
            )
        except jwt.ExpiredSignatureError:
            raise AuthenticationFailed('Token has expired.')
        except jwt.InvalidTokenError as exc:
            raise AuthenticationFailed(f'Invalid token: {exc}')

        clerk_id = payload.get('sub')
        if not clerk_id:
            raise AuthenticationFailed('Token missing sub claim.')

        return (clerk_id, token)

    def authenticate_header(self, request):
        return 'Bearer realm="api"'
