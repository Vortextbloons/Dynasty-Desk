"""Fetch historical award winners.

Output: public/data/shared/awards-history.json
"""

from __future__ import annotations

from typing import Any

from .util import read_cache, with_retry, write_cache, write_json, write_json  # noqa: F401

try:
    from nba_api.stats.endpoints import awardwinners
except Exception as exc:  # pragma: no cover
    print(
        f"Could not import nba_api: {exc}\n"
        "Install with: pip install -r scripts/import_nba/requirements.txt",
        file=sys.stderr,
    )
    raise


def fetch_award_winners(season: str) -> list[dict[str, Any]]:
    cached = read_cache("award_winners", season=season)
    if cached is not None:
        return cached

    def _do_fetch() -> list[dict[str, Any]]:
        out: list[dict[str, Any]] = []
        for award_type in (
            "mvp",
            "dpoy",
            "roy",
            "smoy",
            "mip",
            "finals_mvp",
        ):
            try:
                resp = awardwinners.AwardWinners(season=season, award_type=award_type.upper())
            except Exception:
                continue
            df = resp.get_data_frames()[0]
            for _, row in df.iterrows():
                out.append(
                    {
                        "season": season,
                        "award": award_type,
                        "playerExternalId": str(int(row["PERSON_ID"])),
                        "teamExternalId": str(int(row["TEAM_ID"])) if row.get("TEAM_ID") is not None else "",
                    }
                )
        return out

    payload = with_retry(_do_fetch)
    write_cache("award_winners", payload, season=season)
    return payload


def run(seasons: list[str]) -> None:
    from .config import SHARED_ROOT

    out = SHARED_ROOT / "awards-history.json"
    all_awards: list[dict[str, Any]] = []
    for season in seasons:
        print(f"[{season}] fetching award winners")
        all_awards.extend(fetch_award_winners(season))
    write_json(out, {"version": "0.2.0", "updatedAt": "", "awards": all_awards})
    print(f"  ✓ wrote awards-history.json ({len(all_awards)} entries)")
