"""Fetch career-aggregated stats for each player.

Output: public/data/nba/{season}/career-stats.json
"""

from __future__ import annotations

from typing import Any

from .config import ensure_output_dir
from .util import rate_limit_sleep, read_cache, with_retry, write_cache, write_json

try:
    from nba_api.stats.endpoints import playercareerstats
except Exception as exc:  # pragma: no cover
    print(
        f"Could not import nba_api: {exc}\n"
        "Install with: pip install -r scripts/import_nba/requirements.txt",
        file=sys.stderr,
    )
    raise


def fetch_career(player_external_id: str) -> dict[str, Any] | None:
    cached = read_cache("player_career", player=player_external_id)
    if cached is not None:
        return cached

    def _do_fetch() -> dict[str, Any] | None:
        try:
            resp = playercareerstats.PlayerCareerStats(player_id=player_external_id)
        except Exception:
            return None
        frames = resp.get_data_frames()
        if not frames or frames[0].empty:
            return None
        df = frames[0]
        out: list[dict[str, Any]] = []
        for _, row in df.iterrows():
            out.append(
                {
                    "season": row.get("SEASON_ID"),
                    "teamExternalId": str(row.get("TEAM_ID")) if row.get("TEAM_ID") is not None else None,
                    "gamesPlayed": int(row.get("GP") or 0),
                    "minutes": float(row.get("MIN") or 0),
                    "points": float(row.get("PTS") or 0),
                    "rebounds": float(row.get("REB") or 0),
                    "assists": float(row.get("AST") or 0),
                    "steals": float(row.get("STL") or 0),
                    "blocks": float(row.get("BLK") or 0),
                    "turnovers": float(row.get("TOV") or 0),
                    "fgm": float(row.get("FGM") or 0),
                    "fga": float(row.get("FGA") or 0),
                    "tpm": float(row.get("FG3M") or 0),
                    "tpa": float(row.get("FG3A") or 0),
                    "ftm": float(row.get("FTM") or 0),
                    "fta": float(row.get("FTA") or 0),
                }
            )
        return {"playerExternalId": player_external_id, "seasons": out}

    payload = with_retry(_do_fetch)
    if payload is None:
        return None
    write_cache("player_career", payload, player=player_external_id)
    return payload


def run(season: str, roster: list[dict[str, Any]]) -> None:
    out = ensure_output_dir(season)
    print(f"[{season}] fetching career stats for {len(roster)} players")
    careers: list[dict[str, Any]] = []
    failures = 0
    for p in roster:
        ext_id = p.get("externalId")
        if not ext_id:
            continue
        rate_limit_sleep()
        try:
            c = fetch_career(ext_id)
            if c is not None:
                careers.append(c)
            else:
                failures += 1
        except Exception as exc:  # noqa: BLE001
            failures += 1
            print(f"  ! career fetch failed for {p.get('firstName', '')} {p.get('lastName', '')}: {exc}")
    write_json(out / "career-stats.json", careers)
    print(f"  ✓ wrote career-stats.json ({len(careers)} careers, {failures} failures)")
