"""
Management command to bulk-load all free LeetCode problems into ProblemPool.

Usage:
    python manage.py load_leetcode_problems
    python manage.py load_leetcode_problems --difficulty easy
"""

import time

import requests
from django.core.management.base import BaseCommand

from api_design.models import ProblemPool

LEETCODE_GRAPHQL = "https://leetcode.com/graphql/"

HEADERS = {
    "Content-Type": "application/json",
    "Referer": "https://leetcode.com",
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
}

QUERY = """
query problemList($limit: Int, $skip: Int, $filters: QuestionListFilterInput) {
  questionList(
    categorySlug: ""
    limit: $limit
    skip: $skip
    filters: $filters
  ) {
    totalNum
    data {
      questionFrontendId
      title
      titleSlug
      difficulty
      isPaidOnly
      topicTags {
        name
      }
    }
  }
}
"""


def fetch_batch(skip, limit, difficulty_filter=None):
    filters = {}
    if difficulty_filter:
        filters["difficulty"] = difficulty_filter.upper()

    resp = requests.post(
        LEETCODE_GRAPHQL,
        json={"query": QUERY, "variables": {"limit": limit, "skip": skip, "filters": filters}},
        headers=HEADERS,
        timeout=15,
    )
    resp.raise_for_status()
    data = resp.json()
    if "errors" in data:
        raise RuntimeError(data["errors"][0]["message"])
    return data["data"]["questionList"]


class Command(BaseCommand):
    help = "Fetch all free LeetCode problems and load them into ProblemPool."

    def add_arguments(self, parser):
        parser.add_argument(
            "--difficulty",
            choices=["easy", "medium", "hard"],
            default=None,
            help="Only load problems of this difficulty (default: all).",
        )
        parser.add_argument(
            "--batch-size",
            type=int,
            default=100,
            help="Number of problems to fetch per API request (default: 100).",
        )

    def handle(self, *args, **options):
        difficulty = options["difficulty"]
        batch_size = options["batch_size"]

        self.stdout.write("Fetching total problem count...")
        first = fetch_batch(0, 1, difficulty)
        total = first["totalNum"]
        self.stdout.write(f"Total problems to process: {total}")

        imported = 0
        updated = 0
        skipped_paid = 0
        failed = 0
        offset = 0

        while offset < total:
            try:
                batch = fetch_batch(offset, batch_size, difficulty)
            except Exception as e:
                self.stderr.write(f"Batch at offset {offset} failed: {e}. Retrying in 5s...")
                time.sleep(5)
                try:
                    batch = fetch_batch(offset, batch_size, difficulty)
                except Exception as e2:
                    self.stderr.write(f"Retry failed: {e2}. Skipping batch.")
                    offset += batch_size
                    failed += batch_size
                    continue

            for p in batch["data"]:
                if p["isPaidOnly"]:
                    skipped_paid += 1
                    continue

                difficulty_val = p["difficulty"].lower()
                if difficulty_val not in ("easy", "medium", "hard"):
                    failed += 1
                    continue

                try:
                    leetcode_id = int(p["questionFrontendId"])
                except (ValueError, TypeError):
                    failed += 1
                    continue

                tags = [t["name"] for t in p.get("topicTags", [])]
                url = f"https://leetcode.com/problems/{p['titleSlug']}/"

                _, created = ProblemPool.objects.update_or_create(
                    leetcode_id=leetcode_id,
                    defaults={
                        "title": p["title"],
                        "url": url,
                        "difficulty": difficulty_val,
                        "tags": tags,
                    },
                )
                if created:
                    imported += 1
                else:
                    updated += 1

            offset += batch_size
            self.stdout.write(
                f"  {min(offset, total)}/{total} — "
                f"+{imported} new, {updated} updated, {skipped_paid} paid skipped"
            )
            time.sleep(0.5)

        self.stdout.write(self.style.SUCCESS(
            f"\nDone. {imported} imported, {updated} updated, "
            f"{skipped_paid} paid-only skipped, {failed} failed."
        ))
