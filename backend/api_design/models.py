from django.db import models
from django.db.models import Q, UniqueConstraint


DIFFICULTY_CHOICES = [
    ('easy', 'Easy'),
    ('medium', 'Medium'),
    ('hard', 'Hard'),
]


class UserProfile(models.Model):
    clerk_id = models.CharField(max_length=255, primary_key=True)
    email = models.EmailField(unique=True)
    difficulty_preference = models.CharField(
        max_length=10, choices=DIFFICULTY_CHOICES, default='medium'
    )
    leetcode_username = models.CharField(max_length=100, null=True, blank=True)
    stripe_customer_id = models.CharField(max_length=255, null=True, blank=True)
    stripe_subscription_id = models.CharField(max_length=255, null=True, blank=True)
    is_premium = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    topic_preferences = models.JSONField(default=list)
    current_streak = models.IntegerField(default=0)
    longest_streak = models.IntegerField(default=0)
    skips_remaining = models.IntegerField(default=3)
    skips_reset_at = models.DateField(null=True, blank=True)

    def __str__(self):
        return f"{self.email} ({self.clerk_id})"


class ProblemPool(models.Model):
    leetcode_id = models.IntegerField(unique=True)
    title = models.CharField(max_length=255)
    url = models.URLField()
    difficulty = models.CharField(max_length=10, choices=DIFFICULTY_CHOICES)
    tags = models.JSONField(default=list)

    def __str__(self):
        return f"{self.title} ({self.difficulty})"


class DailyProblem(models.Model):
    user = models.ForeignKey(
        UserProfile, on_delete=models.CASCADE, related_name='daily_problems'
    )
    problem_url = models.URLField()
    problem_title = models.CharField(max_length=255)
    problem_difficulty = models.CharField(max_length=10, choices=DIFFICULTY_CHOICES)
    assigned_date = models.DateField()
    solved = models.BooleanField(default=False)
    solved_at = models.DateTimeField(null=True, blank=True)
    is_punishment = models.BooleanField(default=False)
    skipped = models.BooleanField(default=False)

    class Meta:
        constraints = [
            UniqueConstraint(
                fields=['user', 'assigned_date'],
                condition=Q(is_punishment=False),
                name='unique_primary_per_user_day',
            ),
            UniqueConstraint(
                fields=['user', 'assigned_date'],
                condition=Q(is_punishment=True),
                name='unique_punishment_per_user_day',
            ),
        ]

    def __str__(self):
        return f"{self.user.email} — {self.problem_title} ({self.assigned_date})"
