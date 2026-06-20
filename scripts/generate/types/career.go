package types

import "sort"

type PlayerAccolades struct {
	AllStar     int `json:"allStar"`
	AllNba      int `json:"allNba"`
	AllDefense  int `json:"allDefense"`
	Mvp         int `json:"mvp"`
	FinalsMvp   int `json:"finalsMvp"`
	Champion    int `json:"champion"`
}

type CareerTotals struct {
	GamesPlayed       int     `json:"gamesPlayed"`
	Minutes           int     `json:"minutes"`
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
}

type CareerAverages struct {
	Ppg  float64 `json:"ppg"`
	Rpg  float64 `json:"rpg"`
	Apg  float64 `json:"apg"`
	Spg  float64 `json:"spg"`
	Bpg  float64 `json:"bpg"`
	Mpg  float64 `json:"mpg"`
	Topg float64 `json:"topg"`
}

type PlayerCareerStats struct {
	PlayerId  string              `json:"playerId"`
	Seasons   []PlayerSeasonStats `json:"seasons"`
	Totals    CareerTotals        `json:"totals"`
	Averages  CareerAverages      `json:"averages"`
	Accolades PlayerAccolades     `json:"accolades"`
}

func EmptyAccolades() PlayerAccolades {
	return PlayerAccolades{}
}

func ComputeCareerStats(playerId string, seasons []PlayerSeasonStats, accolades PlayerAccolades) PlayerCareerStats {
	totals := CareerTotals{}
	for _, s := range seasons {
		totals.GamesPlayed += s.GamesPlayed
		totals.Minutes += s.Minutes
		totals.Points += s.Points
		totals.OffensiveRebounds += s.OffensiveRebounds
		totals.DefensiveRebounds += s.DefensiveRebounds
		totals.Rebounds += s.Rebounds
		totals.Assists += s.Assists
		totals.Steals += s.Steals
		totals.Blocks += s.Blocks
		totals.Turnovers += s.Turnovers
		totals.Fouls += s.Fouls
		totals.Fgm += s.Fgm
		totals.Fga += s.Fga
		totals.Tpm += s.Tpm
		totals.Tpa += s.Tpa
		totals.Ftm += s.Ftm
		totals.Fta += s.Fta
	}

	sorted := make([]PlayerSeasonStats, len(seasons))
	copy(sorted, seasons)
	sort.Slice(sorted, func(i, j int) bool {
		return sorted[i].Season < sorted[j].Season
	})

	gp := totals.GamesPlayed
	if gp < 1 {
		gp = 1
	}
	gpF := float64(gp)
	averages := CareerAverages{
		Ppg:  float64(totals.Points) / gpF,
		Rpg:  float64(totals.Rebounds) / gpF,
		Apg:  float64(totals.Assists) / gpF,
		Spg:  float64(totals.Steals) / gpF,
		Bpg:  float64(totals.Blocks) / gpF,
		Mpg:  float64(totals.Minutes) / gpF,
		Topg: float64(totals.Turnovers) / gpF,
	}

	return PlayerCareerStats{
		PlayerId:  playerId,
		Seasons:   sorted,
		Totals:    totals,
		Averages:  averages,
		Accolades: accolades,
	}
}
