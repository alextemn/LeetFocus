from datetime import date

from django.utils import timezone


def mark_solved(daily_problem):
    """
    Mark a DailyProblem as solved.
    For Pro users, updates the streak when the full day is solved.
    """
    daily_problem.solved = True
    daily_problem.solved_at = timezone.now()
    daily_problem.save(update_fields=['solved', 'solved_at'])

    user = daily_problem.user
    if user.is_premium:
        from api_design.services.problem_selector import is_day_fully_solved
        from api_design.services.streak_service import update_streak
        if is_day_fully_solved(user, date.today()):
            update_streak(user)

    return daily_problem
