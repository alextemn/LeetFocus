from django.urls import path
from .views import (
    AuthSyncView, AuthTestView, ChangeProblemView, ProfileView,
    SkipDayView, StripeCheckoutView, StripePortalView,
    StripeWebhookView, TodayAssignView, TodayProblemView, TodayStatusView, VerifySolveView,
)

urlpatterns = [
    path('auth/test/', AuthTestView.as_view(), name='auth-test'),
    path('auth/sync/', AuthSyncView.as_view(), name='auth-sync'),
    path('profile/', ProfileView.as_view(), name='profile'),
    path('today/', TodayProblemView.as_view(), name='today-problem'),
    path('today/assign/', TodayAssignView.as_view(), name='today-assign'),
    path('today/status/', TodayStatusView.as_view(), name='today-status'),
    path('today/verify/', VerifySolveView.as_view(), name='verify-solve'),
    path('today/skip/', SkipDayView.as_view(), name='skip-day'),
    path('today/change/', ChangeProblemView.as_view(), name='change-problem'),
    path('stripe/checkout/', StripeCheckoutView.as_view(), name='stripe-checkout'),
    path('stripe/portal/', StripePortalView.as_view(), name='stripe-portal'),
    #path('stripe/verify-session/', StripeVerifySessionView.as_view(), name='stripe-verify-session'),
    path('stripe/webhook/', StripeWebhookView.as_view(), name='stripe-webhook'),
]
