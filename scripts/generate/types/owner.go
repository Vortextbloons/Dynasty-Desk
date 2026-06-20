package types

type OwnerPersonality string

const (
	OwnerSpendthrift OwnerPersonality = "spendthrift"
	OwnerPatient     OwnerPersonality = "patient"
	OwnerWinNow      OwnerPersonality = "win_now"
	OwnerFrugal      OwnerPersonality = "frugal"
	OwnerMeddler     OwnerPersonality = "meddler"
	OwnerHandsOff    OwnerPersonality = "hands_off"
)

type OwnerProfile struct {
	TeamId                 string           `json:"teamId"`
	Name                   string           `json:"name"`
	Personality            OwnerPersonality `json:"personality"`
	NetWorth               float64          `json:"netWorth"`
	Cash                   float64          `json:"cash"`
	SoftCashPressureSeasons int             `json:"softCashPressureSeasons"`
}
