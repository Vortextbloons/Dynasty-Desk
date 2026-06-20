package types

type AwardWinner struct {
	Season   string `json:"season"`
	Award    string `json:"award"`
	PlayerId string `json:"playerId"`
	TeamId   string `json:"teamId"`
}
