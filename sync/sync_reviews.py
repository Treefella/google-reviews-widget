#!/usr/bin/env python3
"""
sync_reviews.py — Sync Google Reviews to a local reviews.json file.

Usage:
    python sync_reviews.py --place-id <PLACE_ID> --output ./reviews.json

API key is read from the GOOGLE_PLACES_API_KEY environment variable.
Never hardcode credentials in this file.

Requirements:
    pip install requests
"""

import argparse
import json
import os
import sys
from datetime import datetime

try:
    import requests
except ImportError:
    sys.exit("ERROR: 'requests' not installed. Run: pip install requests")


def load_existing(path):
    if os.path.exists(path):
        with open(path) as f:
            try:
                return json.load(f)
            except json.JSONDecodeError:
                pass
    return {}


def fetch_place_details(place_id, api_key):
    url = "https://maps.googleapis.com/maps/api/place/details/json"
    params = {
        "place_id": place_id,
        "fields": "name,rating,user_ratings_total,reviews",
        "reviews_sort": "newest",
        "key": api_key,
    }
    resp = requests.get(url, params=params, timeout=15)
    resp.raise_for_status()
    return resp.json()


def merge_reviews(api_reviews, existing_reviews):
    """Merge API reviews with cached reviews; API data takes priority."""
    by_author = {r["author_name"]: r for r in existing_reviews}
    for r in api_reviews:
        by_author[r["author_name"]] = r
    api_names = {r["author_name"] for r in api_reviews}
    return api_reviews + [r for r in existing_reviews if r["author_name"] not in api_names]


def main():
    parser = argparse.ArgumentParser(
        description="Sync Google Reviews to a local reviews.json file."
    )
    parser.add_argument(
        "--place-id",
        required=True,
        help="Google Place ID (e.g. ChIJN_ug_qbRfUgR...)",
    )
    parser.add_argument(
        "--output",
        default="./reviews.json",
        help="Path to write reviews.json (default: ./reviews.json)",
    )
    parser.add_argument(
        "--business-name",
        default="",
        help="Optional business name to store in reviews.json",
    )
    args = parser.parse_args()

    api_key = os.environ.get("GOOGLE_PLACES_API_KEY")
    if not api_key:
        sys.exit(
            "ERROR: GOOGLE_PLACES_API_KEY environment variable is not set.\n"
            "Set it with: export GOOGLE_PLACES_API_KEY=your_key_here"
        )

    print(f"Fetching reviews for Place ID: {args.place_id}")
    data = fetch_place_details(args.place_id, api_key)

    if data.get("status") != "OK":
        sys.exit(f"API error: {data.get('status')} — {data.get('error_message', 'unknown error')}")

    result = data["result"]

    api_reviews = [
        {
            "author_name": r.get("author_name", ""),
            "rating": r.get("rating", 5),
            "text": r.get("text", ""),
            "time": r.get("relative_time_description", ""),
            "profile_photo_url": r.get("profile_photo_url", ""),
        }
        for r in result.get("reviews", [])
    ]

    existing_data = load_existing(args.output)
    existing_reviews = existing_data.get("reviews", [])
    merged = merge_reviews(api_reviews, existing_reviews)

    output = {
        "business_name": args.business_name or result.get("name", ""),
        "overall_rating": result.get("rating", 5),
        "total_reviews": result.get("user_ratings_total", len(merged)),
        "reviews_count": result.get("user_ratings_total", len(merged)),
        "reviews": merged,
        "last_synced": datetime.now().strftime("%Y-%m-%d %H:%M"),
    }

    output_path = os.path.abspath(args.output)
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "w") as f:
        json.dump(output, f, indent=2)

    api_count = len(api_reviews)
    cached_count = len(merged) - api_count
    print(
        f"Done: {len(merged)} reviews saved to {output_path} "
        f"({api_count} from API + {cached_count} from cache), "
        f"{output['total_reviews']} total on Google."
    )


if __name__ == "__main__":
    main()
