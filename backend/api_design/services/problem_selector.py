import random
from datetime import date, timedelta

from api_design.models import DailyProblem, ProblemPool


def _pick_problem(user, exclude_urls):
    """
    Pick a random problem for the user with topic + difficulty preferences.
    Pro users with topic_preferences: filter candidates by tag match.
    Falls back to difficulty-only, then any difficulty.
    """
    prefs = (user.topic_preferences or []) if user.is_premium else []

    candidates = list(
        ProblemPool.objects
        .filter(difficulty=user.difficulty_preference)
        .exclude(url__in=exclude_urls)
    )

    if prefs:
        topic_filtered = [p for p in candidates if any(t in p.tags for t in prefs)]
        if topic_filtered:
            return random.choice(topic_filtered)

    if candidates:
        return random.choice(candidates)

    # Fall back to any difficulty
    all_candidates = list(ProblemPool.objects.exclude(url__in=exclude_urls))
    if all_candidates:
        return random.choice(all_candidates)

    return None


def _check_missed_day(user, today):
    """Returns True if yesterday had an unsolved primary DailyProblem."""
    yesterday = today - timedelta(days=1)
    return DailyProblem.objects.filter(
        user=user,
        assigned_date=yesterday,
        is_punishment=False,
        solved=False,
    ).exists()


def is_day_fully_solved(user, today):
    """Returns True when all of today's problems are solved."""
    problems = DailyProblem.objects.filter(user=user, assigned_date=today)
    if not problems.exists():
        return False
    return not problems.filter(solved=False).exists()


def get_or_assign_daily_problem(user):
    """
    Return today's primary DailyProblem for the user, creating one if needed.
    Pro users: if yesterday was missed, break streak and assign primary + punishment.
    Returns the primary problem (or None if pool is exhausted).
    """
    today = date.today()

    existing = DailyProblem.objects.filter(
        user=user, assigned_date=today, is_punishment=False
    ).first()
    if existing:
        return existing

    solved_urls = list(
        DailyProblem.objects.filter(user=user, solved=True).values_list('problem_url', flat=True)
    )

    if user.is_premium and _check_missed_day(user, today):
        from api_design.services.streak_service import break_streak
        break_streak(user)

        primary_problem = _pick_problem(user, solved_urls)
        if primary_problem is None:
            return None

        primary = DailyProblem.objects.create(
            user=user,
            problem_url=primary_problem.url,
            problem_title=primary_problem.title,
            problem_difficulty=primary_problem.difficulty,
            assigned_date=today,
            is_punishment=False,
        )

        punishment_problem = _pick_problem(user, solved_urls + [primary_problem.url])
        if punishment_problem:
            DailyProblem.objects.create(
                user=user,
                problem_url=punishment_problem.url,
                problem_title=punishment_problem.title,
                problem_difficulty=punishment_problem.difficulty,
                assigned_date=today,
                is_punishment=True,
            )

        return primary

    problem = _pick_problem(user, solved_urls)
    if problem is None:
        return None

    return DailyProblem.objects.create(
        user=user,
        problem_url=problem.url,
        problem_title=problem.title,
        problem_difficulty=problem.difficulty,
        assigned_date=today,
        is_punishment=False,
    )
