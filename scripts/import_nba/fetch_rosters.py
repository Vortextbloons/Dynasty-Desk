"""Fetch NBA team definitions + opening-night rosters per season.

Output: public/data/nba/{season}/teams.json + roster.json
"""

from __future__ import annotations

import sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from typing import Any

from .config import ensure_output_dir, MAX_WORKERS
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

TEAM_CONFERENCES = {
    "1610612738": ("East", "Atlantic"),   # Celtics
    "1610612747": ("West", "Pacific"),    # Lakers
    "1610612744": ("West", "Pacific"),    # Warriors
    "1610612749": ("East", "Central"),    # Bucks
    "1610612743": ("West", "Northwest"),  # Nuggets
    "1610612760": ("West", "Northwest"),  # Thunder
    "1610612748": ("East", "Southeast"),  # Heat
    "1610612755": ("East", "Atlantic"),   # 76ers
    "1610612751": ("East", "Atlantic"),   # Nets
    "1610612752": ("East", "Atlantic"),   # Knicks
    "1610612741": ("East", "Central"),    # Bulls
    "1610612737": ("East", "Southeast"),  # Hawks
    "1610612739": ("East", "Central"),    # Cavaliers
    "1610612765": ("East", "Central"),    # Pistons
    "1610612754": ("East", "Central"),    # Pacers
    "1610612763": ("West", "Southwest"),  # Grizzlies
    "1610612762": ("West", "Northwest"),  # Jazz
    "1610612761": ("East", "Atlantic"),   # Raptors
    "1610612750": ("West", "Northwest"),  # Timberwolves
    "1610612757": ("West", "Northwest"),  # Trail Blazers
    "1610612758": ("West", "Pacific"),    # Kings
    "1610612756": ("West", "Pacific"),    # Suns
    "1610612746": ("West", "Pacific"),    # Clippers
    "1610612742": ("West", "Southwest"),  # Mavericks
    "1610612745": ("West", "Southwest"),  # Rockets
    "1610612740": ("West", "Southwest"),  # Pelicans
    "1610612764": ("East", "Southeast"),  # Wizards
    "1610612766": ("East", "Southeast"),  # Hornets
    "1610612753": ("East", "Southeast"),  # Magic
    "1610612759": ("West", "Southwest"),  # Spurs
}

TEAM_COLORS = {
    "1610612738": {"primary": "#007a33", "secondary": "#ba9653"},  # Celtics
    "1610612747": {"primary": "#552583", "secondary": "#fdb927"},  # Lakers
    "1610612744": {"primary": "#1d428a", "secondary": "#ffc72c"},  # Warriors
    "1610612749": {"primary": "#00471b", "secondary": "#eee1c6"},  # Bucks
    "1610612743": {"primary": "#0e2240", "secondary": "#fec524"},  # Nuggets
    "1610612760": {"primary": "#007ac1", "secondary": "#ef3b24"},  # Thunder
    "1610612748": {"primary": "#98002e", "secondary": "#f9a01b"},  # Heat
    "1610612755": {"primary": "#006bb6", "secondary": "#ed174c"},  # 76ers
    "1610612751": {"primary": "#000000", "secondary": "#ffffff"},  # Nets
    "1610612752": {"primary": "#006bb6", "secondary": "#f58426"},  # Knicks
    "1610612741": {"primary": "#ce1141", "secondary": "#000000"},  # Bulls
    "1610612737": {"primary": "#e03a3e", "secondary": "#c1d32f"},  # Hawks
    "1610612739": {"primary": "#860038", "secondary": "#fdbb30"},  # Cavaliers
    "1610612765": {"primary": "#c8102e", "secondary": "#1d42ba"},  # Pistons
    "1610612754": {"primary": "#002d62", "secondary": "#fdbb30"},  # Pacers
    "1610612763": {"primary": "#5d76a9", "secondary": "#12173f"},  # Grizzlies
    "1610612762": {"primary": "#002b5c", "secondary": "#f9a01b"},  # Jazz
    "1610612761": {"primary": "#ce1141", "secondary": "#000000"},  # Raptors
    "1610612750": {"primary": "#0c2340", "secondary": "#236192"},  # Timberwolves
    "1610612757": {"primary": "#00788c", "secondary": "#e56020"},  # Trail Blazers
    "1610612758": {"primary": "#5d2d92", "secondary": "#63727a"},  # Kings
    "1610612756": {"primary": "#1d1160", "secondary": "#e56020"},  # Suns
    "1610612746": {"primary": "#c8102e", "secondary": "#000000"},  # Clippers
    "1610612742": {"primary": "#00538c", "secondary": "#002b5e"},  # Mavericks
    "1610612745": {"primary": "#ce1141", "secondary": "#000000"},  # Rockets
    "1610612740": {"primary": "#0c2340", "secondary": "#c8102e"},  # Pelicans
    "1610612764": {"primary": "#00788c", "secondary": "#ef3b24"},  # Wizards
    "1610612766": {"primary": "#1d428a", "secondary": "#c8102e"},  # Hornets
    "1610612753": {"primary": "#00788c", "secondary": "#c4ced4"},  # Magic
    "1610612759": {"primary": "#c4ced4", "secondary": "#000000"},  # Spurs
}


def fetch_team_definitions() -> list[dict[str, Any]]:
    cached = read_cache("teams_static")
    if cached is not None:
        return cached

    def _do_fetch() -> list[dict[str, Any]]:
        data = nba_static_teams.get_teams()
        out: list[dict[str, Any]] = []
        for row in data:
            ext_id = str(int(row["id"]))
            conf, div = TEAM_CONFERENCES.get(ext_id, ("East", "Atlantic"))
            out.append(
                {
                    "externalId": ext_id,
                    "city": row["city"],
                    "name": row["nickname"],
                    "abbreviation": row["abbreviation"],
                    "conference": conf,
                    "division": div,
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
        colors = TEAM_COLORS.get(ext, {"primary": "#1d428a", "secondary": "#c8102e"})
        teams_out.append(
            {
                "id": internal,
                "externalId": ext,
                "city": t["city"],
                "name": t["name"],
                "abbreviation": t["abbreviation"],
                "conference": t["conference"],
                "division": t["division"],
                "colors": colors,
                "arena": t.get("arena", ""),
                "capacity": t.get("capacity", 0),
                "marketSize": 5,
                "prestige": 70,
                "fanPatience": 60,
            }
        )

    write_json(out / "teams.json", teams_out)
    print(f"  [OK] wrote teams.json ({len(teams_out)} teams)")

    print(f"[{season}] fetching rosters ({MAX_WORKERS} workers)")
    team_ids = [t["externalId"] for t in teams]

    def _fetch_one(team_id: str) -> tuple[str, list[dict[str, Any]]]:
        rate_limit_sleep()
        return team_id, fetch_roster(season, team_id)

    roster_out: list[dict[str, Any]] = []
    player_counter: dict[str, int] = {}
    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as pool:
        futures = {pool.submit(_fetch_one, tid): tid for tid in team_ids}
        done = 0
        for future in as_completed(futures):
            done += 1
            team_id, players = future.result()
            internal_id = team_internal_ids[team_id]
            abbr = next((t["abbreviation"] for t in teams if t["externalId"] == team_id), "UNK")
            for p in players:
                key = f"{p['firstName']} {p['lastName']}"
                n = player_counter.get(key, 0) + 1
                player_counter[key] = n
                suffix = f"-{n}" if n > 1 else ""
                fn = p.get("firstName", "?") or "?"
                ln = p.get("lastName", "?") or "?"
                pid = f"p-{abbr.lower()}-{fn[0]}{ln[0]}{suffix}"

                height_str = p.get("height", "")
                height_inches = 78
                if isinstance(height_str, str) and "-" in height_str:
                    parts = height_str.split("-")
                    height_inches = int(parts[0]) * 12 + int(parts[1])
                elif isinstance(height_str, (int, float)):
                    height_inches = int(height_str)

                weight_str = p.get("weight", 0)
                weight_lbs = 200
                if isinstance(weight_str, str) and weight_str.isdigit():
                    weight_lbs = int(weight_str)
                elif isinstance(weight_str, (int, float)):
                    try:
                        weight_lbs = int(weight_str)
                    except (ValueError, OverflowError):
                        weight_lbs = 200

                roster_out.append({
                    "id": pid,
                    "externalId": p["externalId"],
                    "firstName": p["firstName"],
                    "lastName": p["lastName"],
                    "age": p.get("age") or 25,
                    "position": p.get("position", "F"),
                    "secondaryPositions": [],
                    "heightInches": height_inches,
                    "weightLbs": weight_lbs,
                    "teamId": internal_id,
                    "teamExternalId": team_id,
                })
            if done % 10 == 0 or done == len(team_ids):
                print(f"  ... {done}/{len(team_ids)} teams fetched")

    write_json(out / "roster.json", roster_out)
    print(f"  [OK] wrote roster.json ({len(roster_out)} players)")
