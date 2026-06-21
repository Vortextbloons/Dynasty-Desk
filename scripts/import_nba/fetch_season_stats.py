"""Fetch per-season player aggregate stats from nba_api.

Output: public/data/nba/{season}/season-stats.json
"""

from __future__ import annotations

import sys
from pathlib import Path
from typing import Any

from .config import ensure_output_dir
from .util import rate_limit_sleep, read_cache, with_retry, write_cache, write_json

try:
    from nba_api.stats.endpoints import leaguedashplayerstats
except Exception as exc:  # pragma: no cover
    print(
        f"Could not import nba_api: {exc}\n"
        "Install with: pip install -r scripts/import_nba/requirements.txt",
        file=sys.stderr,
    )
    raise


def fetch_league_dash(season: str) -> list[dict[str, Any]]:
    cached = read_cache("league_dash_player_stats", season=season)
    if cached is not None:
        return cached

    def _do_fetch() -> list[dict[str, Any]]:
        out: list[dict[str, Any]] = []
        for measure_type in ("Base", "Advanced", "Scoring", "Usage", "Defense"):
            rate_limit_sleep()
            resp = leaguedashplayerstats.LeagueDashPlayerStats(
                season=season,
                measure_type_detailed_defense=measure_type,
                per_mode_detailed="PerGame",
            )
            df = resp.get_data_frames()[0]
            out.append(
                {
                    "measureType": measure_type,
                    "rows": jsonable_rows(df),
                }
            )
        return out

    payload = with_retry(_do_fetch)
    write_cache("league_dash_player_stats", payload, season=season)
    return payload


def clamp(v: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, v))


def jsonable_rows(df: Any) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for _, row in df.iterrows():
        rows.append({k: (None if (hasattr(v, "item") and not isinstance(v, (list, dict))) else v) for k, v in row.to_dict().items()})
    return rows


def estimate_per(pts: float, reb: float, ast: float, stl: float, blk: float, tov: float,
                  fga: float, fta: float, oreb: float, gp: int) -> float:
    """Estimate PER from box score stats (Hollinger approximation)."""
    if gp == 0:
        return 0
    mpg = pts / max(1, gp)  # rough proxy
    factor = 2 / 3 - 0.5 * (ast / max(1, pts)) * (2 / 3)
    vop = pts / max(1, fga + 0.44 * fta + tov)
    drbp = (reb + blk) / max(1, reb + blk + 0)
    per_unadj = (pts + reb + ast + stl + blk - tov * 2 - fga * (vop - 0.5)) / max(1, gp)
    # Scale to typical PER range (0-30, league avg ~15)
    return clamp(per_unadj * 1.2 + 10, 0, 35)


def estimate_bpm(pts: float, reb: float, ast: float, stl: float, blk: float,
                  tov: float, fga: float, fta: float, gp: int) -> float:
    """Estimate BPM from box score stats (rough approximation)."""
    if gp == 0:
        return 0
    ppg = pts / gp
    rpg = reb / gp
    apg = ast / gp
    spg = stl / gp
    bpg = blk / gp
    topg = tov / gp
    fg_pct = (pts - (fta * 0.75)) / max(1, fga * 2)  # rough
    # Simple BPM-like formula
    bpm = (ppg * 0.09 + rpg * 0.11 + apg * 0.16 + spg * 1.5 + bpg * 1.5 - topg * 0.9 - 12)
    return clamp(bpm, -8, 15)


def to_player_season_stats(payload: list[dict[str, Any]], season: str, roster: list[dict[str, Any]]) -> list[dict[str, Any]]:
    base = next((p for p in payload if p["measureType"] == "Base"), None)
    adv = next((p for p in payload if p["measureType"] == "Advanced"), None)
    if base is None:
        return []
    base_by_id = {str(r["PLAYER_ID"]): r for r in base["rows"]}
    adv_by_id = {str(r["PLAYER_ID"]): r for r in (adv["rows"] if adv else [])}
    roster_by_id = {str(p["externalId"]): p for p in roster}

    out: list[dict[str, Any]] = []
    for ext_id, b in base_by_id.items():
        a = adv_by_id.get(ext_id, {})
        rp = roster_by_id.get(ext_id, {})
        gp = int(b.get("GP") or 0)
        out.append(
            {
                "playerExternalId": ext_id,
                "season": season,
                "teamExternalId": str(b.get("TEAM_ID") or (rp.get("teamExternalId") or "")) or None,
                "gamesPlayed": int(b.get("GP") or 0),
                "minutes": float(b.get("MIN") or 0) * int(b.get("GP") or 0),
                "starts": int(b.get("GS") or 0),
                "points": float(b.get("PTS") or 0) * int(b.get("GP") or 0),
                "rebounds": float(b.get("REB") or 0) * int(b.get("GP") or 0),
                "offensiveRebounds": float(b.get("OREB") or 0) * int(b.get("GP") or 0),
                "defensiveRebounds": float(b.get("DREB") or 0) * int(b.get("GP") or 0),
                "assists": float(b.get("AST") or 0) * int(b.get("GP") or 0),
                "steals": float(b.get("STL") or 0) * int(b.get("GP") or 0),
                "blocks": float(b.get("BLK") or 0) * int(b.get("GP") or 0),
                "turnovers": float(b.get("TOV") or 0) * int(b.get("GP") or 0),
                "fouls": float(b.get("PF") or 0) * int(b.get("GP") or 0),
                "fgm": float(b.get("FGM") or 0) * int(b.get("GP") or 0),
                "fga": float(b.get("FGA") or 0) * int(b.get("GP") or 0),
                "tpm": float(b.get("FG3M") or 0) * int(b.get("GP") or 0),
                "tpa": float(b.get("FG3A") or 0) * int(b.get("GP") or 0),
                "ftm": float(b.get("FTM") or 0) * int(b.get("GP") or 0),
                "fta": float(b.get("FTA") or 0) * int(b.get("GP") or 0),
                "tsPct": float(a.get("TS_PCT") or 0),
                "efgPct": float(a.get("EFG_PCT") or 0),
                "per": float(a.get("PER") or 0) or estimate_per(
                    float(b.get("PTS") or 0) * gp,
                    float(b.get("REB") or 0) * gp,
                    float(b.get("AST") or 0) * gp,
                    float(b.get("STL") or 0) * gp,
                    float(b.get("BLK") or 0) * gp,
                    float(b.get("TOV") or 0) * gp,
                    float(b.get("FGA") or 0) * gp,
                    float(b.get("FTA") or 0) * gp,
                    float(b.get("OREB") or 0) * gp,
                    gp,
                ),
                "usageRate": float(a.get("USG_PCT") or 0) * 100 if a.get("USG_PCT") is not None else 0,
                "winShares": float(a.get("WS") or 0),
                "boxPlusMinus": float(a.get("BPM") or 0) or estimate_bpm(
                    float(b.get("PTS") or 0) * gp,
                    float(b.get("REB") or 0) * gp,
                    float(b.get("AST") or 0) * gp,
                    float(b.get("STL") or 0) * gp,
                    float(b.get("BLK") or 0) * gp,
                    float(b.get("TOV") or 0) * gp,
                    float(b.get("FGA") or 0) * gp,
                    float(b.get("FTA") or 0) * gp,
                    gp,
                ),
                "vorp": float(a.get("VORP") or 0),
            }
        )
    return out


def run(season: str, roster: list[dict[str, Any]]) -> None:
    out = ensure_output_dir(season)
    print(f"[{season}] fetching season stats")
    payload = fetch_league_dash(season)
    rows = to_player_season_stats(payload, season, roster)
    write_json(out / "season-stats.json", rows)
    print(f"  [OK] wrote season-stats.json ({len(rows)} players)")
