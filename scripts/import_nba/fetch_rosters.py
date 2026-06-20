"""Fetch NBA team definitions + opening-night rosters per season.

Output: public/data/nba/{season}/teams.json + roster.json
"""

from __future__ import annotations

import sys
from pathlib import Path
from typing import Any

from .config import ensure_output_dir
from .util import rate_limit_sleep, read_cache, with_retry, write_cache, write_json

try:
    from nba_api.stats.endpoints import commonteamroster, leaguestandings
    from nba_api.stats.static import teams as nba_static_teams
except Exception as exc:  # pragma: no cover - import-time guard
    print(
        f"Could not import nba_api: {exc}\n"
        "Install with: pip install -r scripts/import_nba/requirements.txt",
        file=sys.stderr,
    )
    raise


CURRENT_TEAM_COUNT = 30
CONFERENCE_MAP = {
    "East": "East",
    "West": "West",
}

DIVISION_MAP = {
    "Atlantic": "Atlantic",
    "Central": "Central",
    "Southeast": "Southeast",
    "Northwest": "Northwest",
    "Pacific": "Pacific",
    "Southwest": "Southwest",
}


def fetch_team_definitions() -> list[dict[str, Any]]:
    cached = read_cache("teams_static")
    if cached is not None:
        return cached

    def _do_fetch() -> list[dict[str, Any]]:
        df = nba_static_teams.get_teams()
        out: list[dict[str, Any]] = []
        for _, row in df.iterrows():
            out.append(
                {
                    "externalId": str(int(row["id"])),
                    "city": row["city"],
                    "name": row["nickname"],
                    "abbreviation": row["abbreviation"],
                    "conference": CONFERENCE_MAP.get(row["conference"], row["conference"]),
                    "division": DIVISION_MAP.get(row["division"], row["division"]),
                    "fullName": row["full_name"],
                }
            )
        return out

    teams = with_retry(_do_fetch)
    write_cache("teams_static", teams)
    return teams


def fetch_standings(season: str) -> list[dict[str, Any]]:
    cached = read_cache("standings", season=season)
    if cached is not None:
        return cached

    def _do_fetch() -> list[dict[str, Any]]:
        rs = leaguestandings.LeagueStandings(season=season)
        df = rs.get_data_frames()[0]
        out: list[dict[str, Any]] = []
        for _, row in df.iterrows():
            out.append(
                {
                    "externalId": str(int(row["TeamID"])),
                    "city": row["TeamCity"],
                    "name": row["TeamName"],
                    "conference": row["Conference"],
                    "division": row["Division"],
                    "wins": int(row["WINS"]),
                    "losses": int(row["LOSSES"]),
                    "winPct": float(row["WinPCT"]),
                }
            )
        return out

    standings = with_retry(_do_fetch)
    write_cache("standings", standings, season=season)
    return standings


def fetch_roster(season: str, team_external_id: str) -> list[dict[str, Any]]:
    cached = read_cache("roster", season=season, team=team_external_id)
    if cached is not None:
        return cached

    def _do_fetch() -> list[dict[str, Any]]:
        r = commonteamroster.CommonTeamRoster(season=season, team_id=team_external_id)
        df = r.get_data_frames()[0]
        out: list[dict[str, Any]] = []
        for _, row in df.iterrows():
            out.append(
                {
                    "externalId": str(int(row["PLAYER_ID"])),
                    "firstName": row.get("PLAYER_FIRST_NAME", ""),
                    "lastName": row.get("PLAYER_LAST_NAME", ""),
                    "teamExternalId": team_external_id,
                    "position": row.get("POSITION", ""),
                    "jersey": row.get("NUM", ""),
                    "height": row.get("HEIGHT", ""),
                    "weight": row.get("WEIGHT", ""),
                    "birthDate": row.get("BIRTH_DATE", ""),
                    "age": row.get("AGE", None),
                }
            )
        return out

    roster = with_retry(_do_fetch)
    write_cache("roster", roster, season=season, team=team_external_id)
    return roster


def run(season: str) -> None:
    out = ensure_output_dir(season)
    print(f"[{season}] fetching team definitions")
    teams = fetch_team_definitions()

    if len(teams) != CURRENT_TEAM_COUNT:
        print(f"  ! expected {CURRENT_TEAM_COUNT} teams, got {len(teams)}")

    team_internal_ids: dict[str, str] = {}
    teams_out: list[dict[str, Any]] = []
    for t in teams:
        ext = t["externalId"]
        internal = f"team-{t['abbreviation'].lower()}"
        team_internal_ids[ext] = internal
        teams_out.append(
            {
                "id": internal,
                "externalId": ext,
                "city": t["city"],
                "name": t["name"],
                "abbreviation": t["abbreviation"],
                "conference": t["conference"],
                "division": t["division"],
                "colors": {
                    "primary": "#1d428a",
                    "secondary": "#c8102e",
                },
                "marketSize": 5,
                "prestige": 70,
                "fanPatience": 60,
            }
        )

    write_json(out / "teams.json", teams_out)
    print(f"  ✓ wrote teams.json ({len(teams_out)} teams)")

    print(f"[{season}] fetching rosters")
    roster_out: list[dict[str, Any]] = []
    for t in teams:
        team_id = t["externalId"]
        rate_limit_sleep()
        players = fetch_roster(season, team_id)
        for p in players:
            roster_out.append(
                {
                    **p,
                    "teamInternalId": team_internal_ids[team_id],
                }
            )
    write_json(out / "roster.json", roster_out)
    print(f"  ✓ wrote roster.json ({len(roster_out)} players)")
