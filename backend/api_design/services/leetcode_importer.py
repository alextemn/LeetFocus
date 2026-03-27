import requests

LEETCODE_GRAPHQL = "https://leetcode.com/graphql/"

# Headers that mimic a real browser — LeetCode blocks bare requests
HEADERS = {
    "Content-Type": "application/json",
    "Referer": "https://leetcode.com",
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
}


def _gql(query, variables):
    """Send a GraphQL request and return the data dict."""
    resp = requests.post(
        LEETCODE_GRAPHQL,
        json={"query": query, "variables": variables},
        headers=HEADERS,
        timeout=10,
    )
    resp.raise_for_status()
    payload = resp.json()
    if "errors" in payload:
        raise ValueError(payload["errors"][0]["message"])
    return payload["data"]


def fetch_user_stats(username):
    """
    Returns solved counts per difficulty, e.g.
    {"easy": 42, "medium": 31, "hard": 8}
    Raises ValueError if the user doesn't exist.
    """
    data = _gql(
        """
        query userStats($username: String!) {
          matchedUser(username: $username) {
            submitStatsGlobal {
              acSubmissionNum {
                difficulty
                count
              }
            }
          }
        }
        """,
        {"username": username},
    )
    user = data.get("matchedUser")
    if not user:
        raise ValueError(f"LeetCode user '{username}' not found.")

    return {
        item["difficulty"].lower(): item["count"]
        for item in user["submitStatsGlobal"]["acSubmissionNum"]
        if item["difficulty"] != "All"
    }


def fetch_recent_solved(username, limit=20):
    """
    Returns up to `limit` recently accepted submissions as a list of
    {"id", "title", "titleSlug", "timestamp"} dicts.
    LeetCode's public API caps this at 20 without authentication.
    """
    data = _gql(
        """
        query recentAcSubmissions($username: String!, $limit: Int!) {
          recentAcSubmissionList(username: $username, limit: $limit) {
            id
            title
            titleSlug
            timestamp
          }
        }
        """,
        {"username": username, "limit": limit},
    )
    return data.get("recentAcSubmissionList") or []


def fetch_problem_details(title_slug):
    """
    Returns problem metadata for a single problem by its URL slug.
    e.g. "two-sum" → {questionFrontendId, title, difficulty, topicTags}
    """
    data = _gql(
        """
        query questionData($titleSlug: String!) {
          question(titleSlug: $titleSlug) {
            questionFrontendId
            title
            titleSlug
            difficulty
            topicTags {
              name
            }
          }
        }
        """,
        {"titleSlug": title_slug},
    )
    return data.get("question")


def import_solved_problems(username):
    """
    Main entry point called by the API view.

    1. Validates the LeetCode username exists and fetches solve stats.
    2. Fetches the user's 20 most recent accepted submissions.
    3. For each unique problem, fetches its details and upserts a ProblemPool row.
    4. Returns a summary dict.

    Note: LeetCode's public GraphQL limits recent submissions to 20 without
    a session cookie. A future improvement can accept an optional session
    token to remove this cap.
    """
    from api_design.models import ProblemPool

    # Step 1 — validate user + get stats
    stats = fetch_user_stats(username)

    # Step 2 — recent accepted submissions, deduplicated by slug
    submissions = fetch_recent_solved(username, limit=20)
    seen = set()
    unique = []
    for sub in submissions:
        if sub["titleSlug"] not in seen:
            seen.add(sub["titleSlug"])
            unique.append(sub)

    # Step 3 — fetch details and upsert into ProblemPool
    imported = 0
    already_existed = 0
    failed = 0

    for sub in unique:
        try:
            details = fetch_problem_details(sub["titleSlug"])
            if not details or not details.get("questionFrontendId"):
                failed += 1
                continue

            difficulty = details["difficulty"].lower()
            if difficulty not in ("easy", "medium", "hard"):
                failed += 1
                continue

            _, created = ProblemPool.objects.get_or_create(
                leetcode_id=int(details["questionFrontendId"]),
                defaults={
                    "title": details["title"],
                    "url": f"https://leetcode.com/problems/{details['titleSlug']}/",
                    "difficulty": difficulty,
                    "tags": [tag["name"] for tag in details.get("topicTags", [])],
                },
            )
            if created:
                imported += 1
            else:
                already_existed += 1

        except Exception:
            failed += 1
            continue

    return {
        "username": username,
        "stats": stats,
        "imported": imported,
        "already_existed": already_existed,
        "failed": failed,
        "total_processed": len(unique),
        "note": "LeetCode's public API returns up to 20 recent submissions. Provide a session cookie for full history.",
    }
