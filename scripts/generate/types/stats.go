package types

type PlayerSeasonStats struct {
	PlayerId          string  `json:"playerId"`
	Season            string  `json:"season"`
	TeamId            *string `json:"teamId"`
	GamesPlayed       int     `json:"gamesPlayed"`
	Minutes           int     `json:"minutes"`
	Starts            int     `json:"starts"`
	Points            int     `json:"points"`
	Rebounds          int     `json:"rebounds"`
	OffensiveRebounds int     `json:"offensiveRebounds"`
	DefensiveRebounds int     `json:"defensiveRebounds"`
	Assists           int     `json:"assists"`
	Steals            int     `json:"steals"`
	Blocks            int     `json:"blocks"`
	Turnovers         int     `json:"turnovers"`
	Fouls             int     `json:"fouls"`
	Fgm               int     `json:"fgm"`
	Fga               int     `json:"fga"`
	Tpm               int     `json:"tpm"`
	Tpa               int     `json:"tpa"`
	Ftm               int     `json:"ftm"`
	Fta               int     `json:"fta"`
	TsPct             float64 `json:"tsPct"`
	EfgPct            float64 `json:"efgPct"`
	Per               float64 `json:"per"`
	UsageRate         float64 `json:"usageRate"`
	WinShares         float64 `json:"winShares"`
	BoxPlusMinus       float64 `json:"boxPlusMinus"`
	Vorp              float64 `json:"vorp"`
}

type PerGameStats struct {
	Ppg  float64
	Rpg  float64
	Apg  float64
	Spg  float64
	Bpg  float64
	Mpg  float64
	Topg float64
}

func PerGame(stats PlayerSeasonStats) PerGameStats {
	gp := stats.GamesPlayed
	if gp < 1 {
		gp = 1
	}
	gpF := float64(gp)
	return PerGameStats{
		Ppg:  float64(stats.Points) / gpF,
		Rpg:  float64(stats.Rebounds) / gpF,
		Apg:  float64(stats.Assists) / gpF,
		Spg:  float64(stats.Steals) / gpF,
		Bpg:  float64(stats.Blocks) / gpF,
		Mpg:  float64(stats.Minutes) / gpF,
		Topg: float64(stats.Turnovers) / gpF,
	}
}

func EmptySeasonStats(playerId, season string, teamId *string) PlayerSeasonStats {
	return PlayerSeasonStats{
		PlayerId: playerId,
		Season:   season,
		TeamId:   teamId,
	}
}
