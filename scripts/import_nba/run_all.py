"""Run the full nba_api import pipeline.

Usage:
    python -m scripts.import_nba.run_all                 # fetch all default seasons
    python -m scripts.import_nba.run_all --seasons 2024-25 2023-24
    python -m scripts.import_nba.run_all --skip-awards   # skip slow award fetcher
    python -m scripts.import_nba.run_all --skip-schedule  # skip schedule fetch
    python -m scripts.import_nba.run_all --skip-draft    # skip draft history fetch
    python -m scripts.import_nba.run_all --force-champions
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO_ROOT))

from scripts.import_nba import (
    compute_careers,
    compute_era_config,
    fetch_awards,
    fetch_champions,
    fetch_draft,
    fetch_rosters,
    fetch_schedule,
    fetch_season_stats,
)
from scripts.import_nba.config import DEFAULT_SEASONS


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--seasons", nargs="*", default=None)
    parser.add_argument("--skip-awards", action="store_true")
    parser.add_argument("--skip-schedule", action="store_true")
    parser.add_argument("--skip-draft", action="store_true")
    parser.add_argument("--force-champions", action="store_true")
    args = parser.parse_args()

    seasons = args.seasons or DEFAULT_SEASONS
    print(f"Running pipeline for {len(seasons)} seasons")

    for season in seasons:
        print(f"\n=== {season} ===")
        fetch_rosters.run(season)

        roster_path = Path("public") / "data" / "nba" / season / "roster.json"
        roster = []
        if roster_path.exists():
            import json
            roster = json.loads(roster_path.read_text(encoding="utf-8"))

        fetch_season_stats.run(season, roster)
        compute_era_config.run([season])

        if not args.skip_schedule:
            fetch_schedule.run(season)

    print("\n=== careers ===")
    compute_careers.run(seasons)

    if not args.skip_awards:
        print("\n=== awards ===")
        fetch_awards.run(seasons)

    print("\n=== champions ===")
    fetch_champions.run(force=args.force_champions)

    if not args.skip_draft:
        print("\n=== draft ===")
        fetch_draft.run()

    print("\nAll done.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
