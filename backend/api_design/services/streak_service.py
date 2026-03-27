from datetime import date

from api_design.models import DailyProblem


def is_day_fully_solved(user, today):
    """Returns True when all of today's problems are solved."""
    problems = DailyProblem.objects.filter(user=user, assigned_date=today)
    if not problems.exists():
        return False
    return not problems.filter(solved=False).exists()


def reset_skips_if_needed(profile):
    """Lazy monthly reset of skips_remaining to 3."""
    today = date.today()
    if (
        profile.skips_reset_at is None
        or profile.skips_reset_at.year != today.year
        or profile.skips_reset_at.month != today.month
    ):
        profile.skips_remaining = 3
        profile.skips_reset_at = today
        profile.save(update_fields=['skips_remaining', 'skips_reset_at'])


def update_streak(profile):
    """Increment current_streak and update longest_streak if needed."""
    profile.current_streak += 1
    if profile.current_streak > profile.longest_streak:
        profile.longest_streak = profile.current_streak
    profile.save(update_fields=['current_streak', 'longest_streak'])


def break_streak(profile):
    """Reset current_streak to 0."""
    profile.current_streak = 0
    profile.save(update_fields=['current_streak'])
