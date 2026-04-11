import stripe
from django.conf import settings
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import DailyProblem, UserProfile
from .serializers import DailyProblemSerializer, UserProfileSerializer
from .services.leetcode_checker import mark_solved
from .services.problem_selector import get_daily_problem, get_or_assign_daily_problem, is_day_fully_solved


def _clerk_id(request):
    return request.user.username


def _get_or_create_profile(request):
    clerk_id = _clerk_id(request)
    email = request.user.email or ''

    if email:
        UserProfile.objects.filter(email=email).exclude(clerk_id=clerk_id).delete()

    profile, _ = UserProfile.objects.get_or_create(
        clerk_id=clerk_id,
        defaults={'email': email},
    )
    return profile


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------

class AuthTestView(APIView):
    def get(self, request):
        return Response({
            'authenticated': True,
            'clerk_id': request.user.username,
            'email': request.user.email or '(not synced yet)',
        })


class AuthSyncView(APIView):
    def post(self, request):
        clerk_id = _clerk_id(request)
        email = request.data.get('email', '').strip()

        if not email:
            return Response({'error': 'email is required'}, status=status.HTTP_400_BAD_REQUEST)

        UserProfile.objects.filter(email=email).exclude(clerk_id=clerk_id).delete()

        profile, created = UserProfile.objects.get_or_create(
            clerk_id=clerk_id,
            defaults={'email': email},
        )

        if not created and profile.email != email:
            profile.email = email
            profile.save(update_fields=['email'])

        serializer = UserProfileSerializer(profile)
        return Response(serializer.data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


# ---------------------------------------------------------------------------
# Profile
# ---------------------------------------------------------------------------

class ProfileView(APIView):
    def get(self, request):
        profile = _get_or_create_profile(request)
        return Response(UserProfileSerializer(profile).data)

    def patch(self, request):
        profile = _get_or_create_profile(request)
        serializer = UserProfileSerializer(profile, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ---------------------------------------------------------------------------
# Daily problem
# ---------------------------------------------------------------------------

class TodayProblemView(APIView):
    def get(self, request):
        profile = _get_or_create_profile(request)
        daily = get_daily_problem(profile)
        if daily is None:
            return Response({'assigned': False})
        return Response(DailyProblemSerializer(daily).data)


class TodayAssignView(APIView):
    def post(self, request):
        profile = _get_or_create_profile(request)
        daily = get_or_assign_daily_problem(profile)
        if daily is None:
            return Response(
                {'error': 'No problems available in the pool.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        return Response(DailyProblemSerializer(daily).data)


class TodayStatusView(APIView):
    def get(self, request):
        profile = _get_or_create_profile(request)
        today = timezone.now().date()

        if profile.is_premium:
            from .services.streak_service import reset_skips_if_needed
            reset_skips_if_needed(profile)
            profile.refresh_from_db()

        primary = get_daily_problem(profile)

        if primary is None:
            return Response({
                'assigned': False,
                'primary': None,
                'punishment': None,
                'is_punishment_day': False,
                'day_fully_solved': False,
                'current_streak': profile.current_streak if profile.is_premium else None,
                'skips_remaining': profile.skips_remaining if profile.is_premium else None,
            })

        punishment = DailyProblem.objects.filter(
            user=profile, assigned_date=today, is_punishment=True
        ).first()

        day_fully_solved = is_day_fully_solved(profile, today)

        return Response({
            'assigned': True,
            'primary': DailyProblemSerializer(primary).data,
            'punishment': DailyProblemSerializer(punishment).data if punishment else None,
            'is_punishment_day': punishment is not None,
            'day_fully_solved': day_fully_solved,
            'current_streak': profile.current_streak if profile.is_premium else None,
            'skips_remaining': profile.skips_remaining if profile.is_premium else None,
        })


class VerifySolveView(APIView):
    def post(self, request):
        profile = _get_or_create_profile(request)
        today = timezone.now().date()
        problem_id = request.data.get('problem_id')

        if problem_id:
            try:
                daily = DailyProblem.objects.get(id=problem_id, user=profile, assigned_date=today)
            except DailyProblem.DoesNotExist:
                return Response({'error': 'Problem not found.'}, status=status.HTTP_404_NOT_FOUND)
        else:
            try:
                daily = DailyProblem.objects.get(
                    user=profile, assigned_date=today, is_punishment=False
                )
            except DailyProblem.DoesNotExist:
                return Response(
                    {'error': 'No problem assigned for today.'}, status=status.HTTP_404_NOT_FOUND
                )

        if daily.solved:
            return Response(DailyProblemSerializer(daily).data)

        daily = mark_solved(daily)
        return Response(DailyProblemSerializer(daily).data)


class SkipDayView(APIView):
    def post(self, request):
        profile = _get_or_create_profile(request)

        if not profile.is_premium:
            return Response(
                {'error': 'Pro subscription required.'}, status=status.HTTP_403_FORBIDDEN
            )

        from .services.streak_service import reset_skips_if_needed
        reset_skips_if_needed(profile)
        profile.refresh_from_db()

        if profile.skips_remaining == 0:
            return Response(
                {'error': 'No skips remaining this month.'}, status=status.HTTP_400_BAD_REQUEST
            )

        today = timezone.now().date()
        try:
            primary = DailyProblem.objects.get(
                user=profile, assigned_date=today, is_punishment=False
            )
        except DailyProblem.DoesNotExist:
            return Response(
                {'error': 'No problem assigned for today.'}, status=status.HTTP_404_NOT_FOUND
            )

        if primary.solved or primary.skipped:
            return Response(
                {'error': 'Problem already solved or skipped.'}, status=status.HTTP_400_BAD_REQUEST
            )

        now = timezone.now()
        primary.solved = True
        primary.skipped = True
        primary.solved_at = now
        primary.save(update_fields=['solved', 'skipped', 'solved_at'])

        punishment = DailyProblem.objects.filter(
            user=profile, assigned_date=today, is_punishment=True, solved=False
        ).first()
        if punishment:
            punishment.solved = True
            punishment.skipped = True
            punishment.solved_at = now
            punishment.save(update_fields=['solved', 'skipped', 'solved_at'])

        profile.skips_remaining -= 1
        profile.save(update_fields=['skips_remaining'])

        return Response({
            'primary': DailyProblemSerializer(primary).data,
            'skips_remaining': profile.skips_remaining,
        })


class ChangeProblemView(APIView):
    def post(self, request):
        profile = _get_or_create_profile(request)
        today = timezone.now().date()

        if profile.is_premium:
            if DailyProblem.objects.filter(
                user=profile, assigned_date=today, is_punishment=True
            ).exists():
                return Response(
                    {'error': 'Cannot change problem on a punishment day.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        try:
            daily = DailyProblem.objects.get(
                user=profile, assigned_date=today, is_punishment=False
            )
        except DailyProblem.DoesNotExist:
            return Response(
                {'error': 'No problem assigned for today.'}, status=status.HTTP_404_NOT_FOUND
            )

        if daily.solved:
            return Response(
                {'error': 'Cannot change a solved problem.'}, status=status.HTTP_400_BAD_REQUEST
            )

        daily.delete()
        new_daily = get_or_assign_daily_problem(profile)
        if new_daily is None:
            return Response(
                {'error': 'No problems available in the pool.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        return Response(DailyProblemSerializer(new_daily).data)


# ---------------------------------------------------------------------------
# Stripe
# ---------------------------------------------------------------------------

class StripeCheckoutView(APIView):
    def post(self, request):
        profile = _get_or_create_profile(request)
        stripe.api_key = settings.STRIPE_SECRET_KEY

        if not profile.stripe_customer_id:
            customer = stripe.Customer.create(email=profile.email)
            profile.stripe_customer_id = customer.id
            profile.save(update_fields=['stripe_customer_id'])

        session = stripe.checkout.Session.create(
            customer=profile.stripe_customer_id,
            payment_method_types=['card'],
            line_items=[{'price': settings.STRIPE_PRO_PRICE_ID, 'quantity': 1}],
            mode='subscription',
            success_url=f"{settings.FRONTEND_URL}/settings?upgraded=true&session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{settings.FRONTEND_URL}/settings",
        )

        return Response({'checkout_url': session.url})


class StripePortalView(APIView):
    def post(self, request):
        profile = _get_or_create_profile(request)

        if not profile.stripe_customer_id:
            return Response(
                {'error': 'No billing account found.'}, status=status.HTTP_400_BAD_REQUEST
            )

        stripe.api_key = settings.STRIPE_SECRET_KEY

        portal_session = stripe.billing_portal.Session.create(
            customer=profile.stripe_customer_id,
            return_url=f"{settings.FRONTEND_URL}/settings",
        )

        return Response({'portal_url': portal_session.url})


class StripeVerifySessionView(APIView):
    def post(self, request):
        session_id = request.data.get('session_id')
        if not session_id:
            return Response({'error': 'session_id required.'}, status=status.HTTP_400_BAD_REQUEST)

        stripe.api_key = settings.STRIPE_SECRET_KEY

        try:
            session = stripe.checkout.Session.retrieve(session_id)
        except stripe.error.InvalidRequestError:
            return Response({'error': 'Invalid session.'}, status=status.HTTP_400_BAD_REQUEST)

        if session.payment_status != 'paid':
            return Response({'error': 'Payment not completed.'}, status=status.HTTP_402_PAYMENT_REQUIRED)

        profile = _get_or_create_profile(request)
        customer_id = session.customer
        subscription_id = session.subscription

        if customer_id and profile.stripe_customer_id != customer_id:
            return Response(
                {'error': 'Session does not belong to this user.'}, status=status.HTTP_403_FORBIDDEN
            )

        profile.stripe_subscription_id = subscription_id
        profile.is_premium = True
        if not profile.skips_remaining:
            profile.skips_remaining = 3
        profile.save(update_fields=['stripe_subscription_id', 'is_premium', 'skips_remaining'])

        return Response({'status': 'ok'})


@method_decorator(csrf_exempt, name='dispatch')
class StripeWebhookView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        stripe.api_key = settings.STRIPE_SECRET_KEY
        payload = request.body
        sig_header = request.META.get('HTTP_STRIPE_SIGNATURE', '')

        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
            )
        except (ValueError, stripe.error.SignatureVerificationError):
            return Response({'error': 'Invalid signature.'}, status=status.HTTP_400_BAD_REQUEST)

        event_type = event['type']
        obj = event['data']['object']

        if event_type == 'checkout.session.completed':
            customer_id = obj.get('customer')
            subscription_id = obj.get('subscription')
            profile = UserProfile.objects.filter(stripe_customer_id=customer_id).first()
            if profile:
                profile.stripe_subscription_id = subscription_id
                profile.is_premium = True
                profile.skips_remaining = 3
                profile.save(update_fields=['stripe_subscription_id', 'is_premium', 'skips_remaining'])

        elif event_type in ('customer.subscription.updated', 'customer.subscription.created'):
            customer_id = obj.get('customer')
            subscription_id = obj.get('id')
            sub_status = obj.get('status')
            cancel_at_period_end = obj.get('cancel_at_period_end', False)
            profile = UserProfile.objects.filter(stripe_customer_id=customer_id).first()
            if profile:
                is_active = sub_status in ('active', 'trialing') and not cancel_at_period_end
                profile.stripe_subscription_id = subscription_id
                profile.is_premium = is_active
                if not is_active:
                    profile.skips_remaining = 0
                profile.save(update_fields=['stripe_subscription_id', 'is_premium', 'skips_remaining'])

        elif event_type in ('customer.subscription.deleted', 'customer.subscription.paused'):
            customer_id = obj.get('customer')
            profile = UserProfile.objects.filter(stripe_customer_id=customer_id).first()
            if profile:
                profile.is_premium = False
                profile.skips_remaining = 0
                profile.save(update_fields=['is_premium', 'skips_remaining'])

        elif event_type == 'invoice.paid':
            customer_id = obj.get('customer')
            profile = UserProfile.objects.filter(stripe_customer_id=customer_id).first()
            if profile:
                profile.is_premium = True
                profile.save(update_fields=['is_premium'])

        elif event_type == 'invoice.payment_failed':
            customer_id = obj.get('customer')
            profile = UserProfile.objects.filter(stripe_customer_id=customer_id).first()
            if profile:
                profile.is_premium = False
                profile.save(update_fields=['is_premium'])

        return Response({'status': 'ok'})
