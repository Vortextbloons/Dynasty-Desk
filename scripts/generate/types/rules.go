package types

type LeagueRules struct {
	SeasonLabel             string  `json:"seasonLabel"`
	TeamCount               int     `json:"teamCount"`
	RegularSeasonGames      int     `json:"regularSeasonGames"`
	PlayoffTeamsPerConf     int     `json:"playoffTeamsPerConference"`
	PlayoffSeriesLength     int     `json:"playoffSeriesLength"`
	SalaryCapEnabled        bool    `json:"salaryCapEnabled"`
	SalaryCap               float64 `json:"salaryCap"`
	LuxuryTaxEnabled        bool    `json:"luxuryTaxEnabled"`
	MaxRosterSize           int     `json:"maxRosterSize"`
	MinRosterSize           int     `json:"minRosterSize"`
	MaxContractYears        int     `json:"maxContractYears"`
	DraftRounds             int     `json:"draftRounds"`
	ThreePointLineDistance  float64 `json:"threePointLineDistance"`
	PlayoffFormat           string  `json:"playoffFormat"`
	HasPlayIn               bool    `json:"hasPlayIn"`
	Apron                   float64 `json:"apron"`
	SecondApron             float64 `json:"secondApron"`
	LuxuryTaxLine           float64 `json:"luxuryTaxLine"`
	LuxuryTaxRates          LuxuryTaxRates `json:"luxuryTaxRates"`
	SecondApronTaxRate      float64 `json:"secondApronTaxRate"`
	ApronPenaltyPerMillion  float64 `json:"apronPenaltyPerMillion"`
	MidLevelException       float64 `json:"midLevelException"`
	BiAnnualException       float64 `json:"biAnnualException"`
	RoomMle                 float64 `json:"roomMle"`
	MinimumPlayerSalary     float64 `json:"minimumPlayerSalary"`
	MinimumTeamSalary       float64 `json:"minimumTeamSalary"`
	TradeExceptionYears     int     `json:"tradeExceptionYears"`
	AllowCashInTrades       bool    `json:"allowCashInTrades"`
	TwoWaySlots             int     `json:"twoWaySlots"`
	RookieScale             string  `json:"rookieScale"`
	RookieDealYears         int     `json:"rookieDealYears"`
	RookieOptionYears       int     `json:"rookieOptionYears"`
}

type LuxuryTaxRates struct {
	NonTaxpayer float64 `json:"nonTaxpayer"`
	Taxpayer    float64 `json:"taxpayer"`
	Repeater    float64 `json:"repeater"`
}
