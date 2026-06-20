package types

type Champion struct {
	Season            string `json:"season"`
	ChampionTeamId    string `json:"championTeamId"`
	RunnerUpTeamId    string `json:"runnerUpTeamId"`
	FinalsMvpPlayerId string `json:"finalsMvpPlayerId"`
	SeriesResult      string `json:"seriesResult"`
}

type ChampionHistoryEntry struct {
	Season           string `json:"season"`
	ChampionAbbrev   string `json:"championAbbrev"`
	RunnerUpAbbrev   string `json:"runnerUpAbbrev"`
	FinalsMvpName    string `json:"finalsMvpName"`
	SeriesResult     string `json:"seriesResult"`
}
