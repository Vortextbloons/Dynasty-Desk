package types

type Position string

const (
	PositionPG Position = "PG"
	PositionSG Position = "SG"
	PositionSF Position = "SF"
	PositionPF Position = "PF"
	PositionC  Position = "C"
)

type TeamColors struct {
	Primary   string `json:"primary"`
	Secondary string `json:"secondary"`
}

type ImportMeta struct {
	SnapshotSeason string `json:"snapshotSeason"`
	StatsSource    string `json:"statsSource"`
	LastUpdated    string `json:"lastUpdated"`
}

type StaticTeam struct {
	Id           string        `json:"id"`
	ExternalId   string        `json:"externalId,omitempty"`
	City         string        `json:"city"`
	Name         string        `json:"name"`
	Abbreviation string        `json:"abbreviation"`
	Conference   string        `json:"conference"`
	Division     string        `json:"division"`
	Colors       TeamColors    `json:"colors"`
	Arena        string        `json:"arena,omitempty"`
	Capacity     int           `json:"capacity,omitempty"`
	MarketSize   int           `json:"marketSize"`
	Prestige     int           `json:"prestige"`
	FanPatience  int           `json:"fanPatience"`
	Owner        *OwnerProfile `json:"owner,omitempty"`
	ImportMeta   *ImportMeta   `json:"importMeta,omitempty"`
}

type StaticPlayer struct {
	Id                string            `json:"id"`
	ExternalId        string            `json:"externalId,omitempty"`
	FirstName         string            `json:"firstName"`
	LastName          string            `json:"lastName"`
	Age               int               `json:"age"`
	Position          Position          `json:"position"`
	SecondaryPositions []Position       `json:"secondaryPositions"`
	HeightInches      int               `json:"heightInches"`
	WeightLbs         int               `json:"weightLbs"`
	TeamId            *string           `json:"teamId"`
	HeadshotUrl       string            `json:"headshotUrl,omitempty"`
	College           string            `json:"college,omitempty"`
	Country           string            `json:"country,omitempty"`
	DraftYear         int               `json:"draftYear,omitempty"`
	DraftRound        int               `json:"draftRound,omitempty"`
	DraftPick         int               `json:"draftPick,omitempty"`
	BirthDate         string            `json:"birthDate,omitempty"`
	Ratings           PlayerRatings     `json:"ratings"`
	Tendencies        PlayerTendencies  `json:"tendencies"`
	Traits            PlayerTraits      `json:"traits"`
	Contract          Contract          `json:"contract"`
	ImportMeta        *ImportMeta       `json:"importMeta,omitempty"`
}

type StaticSnapshot struct {
	Id          string             `json:"id"`
	Name        string             `json:"name"`
	Type        string             `json:"type"`
	SeasonLabel string             `json:"seasonLabel"`
	StartYear   int                `json:"startYear"`
	Teams       []StaticTeam       `json:"teams"`
	Players     []StaticPlayer     `json:"players"`
	SeasonStats []PlayerSeasonStats `json:"seasonStats"`
	CareerStats []PlayerCareerStats `json:"careerStats"`
	EraConfig   EraConfig          `json:"eraConfig"`
	Rules       LeagueRules        `json:"rules"`
	Awards      []AwardWinner      `json:"awards"`
	Champions   []Champion         `json:"champions"`
}

type DataManifestEntry struct {
	Id          string `json:"id"`
	Name        string `json:"name"`
	Type        string `json:"type"`
	SeasonLabel string `json:"seasonLabel"`
	StartYear   int    `json:"startYear"`
	BasePath    string `json:"basePath"`
	TeamCount   int    `json:"teamCount"`
	PlayerCount int    `json:"playerCount"`
}

type DataManifest struct {
	Version          string              `json:"version"`
	DefaultSnapshotId string             `json:"defaultSnapshotId"`
	Snapshots        []DataManifestEntry `json:"snapshots"`
}
