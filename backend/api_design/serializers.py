from rest_framework import serializers
from .models import UserProfile, DailyProblem, ProblemPool


class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = [
            'clerk_id', 'email', 'difficulty_preference', 'is_premium', 'created_at',
            'topic_preferences', 'current_streak', 'longest_streak', 'skips_remaining',
        ]
        read_only_fields = [
            'clerk_id', 'is_premium', 'created_at',
            'current_streak', 'longest_streak', 'skips_remaining',
        ]


class DailyProblemSerializer(serializers.ModelSerializer):
    class Meta:
        model = DailyProblem
        fields = [
            'id', 'problem_url', 'problem_title', 'problem_difficulty',
            'assigned_date', 'solved', 'solved_at', 'is_punishment', 'skipped',
        ]
        read_only_fields = [
            'id', 'assigned_date', 'solved', 'solved_at', 'is_punishment', 'skipped',
        ]


class ProblemPoolSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProblemPool
        fields = ['id', 'leetcode_id', 'title', 'url', 'difficulty', 'tags']
