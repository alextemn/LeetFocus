from django.contrib import admin
from .models import UserProfile, DailyProblem, ProblemPool


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ['clerk_id', 'email', 'difficulty_preference', 'is_premium', 'created_at']
    search_fields = ['email', 'clerk_id']
    list_filter = ['difficulty_preference', 'is_premium']


@admin.register(ProblemPool)
class ProblemPoolAdmin(admin.ModelAdmin):
    list_display = ['leetcode_id', 'title', 'difficulty']
    search_fields = ['title']
    list_filter = ['difficulty']


@admin.register(DailyProblem)
class DailyProblemAdmin(admin.ModelAdmin):
    list_display = ['user', 'problem_title', 'problem_difficulty', 'assigned_date', 'solved']
    search_fields = ['problem_title', 'user__email']
    list_filter = ['solved', 'problem_difficulty', 'assigned_date']
