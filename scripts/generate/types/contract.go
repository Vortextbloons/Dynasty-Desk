package types

type ContractOption string

const (
	ContractOptionNone   ContractOption = "none"
	ContractOptionTeam   ContractOption = "team"
	ContractOptionPlayer ContractOption = "player"
)

type TradeKickerCondition string

const (
	TradeKickerOnRosterDate    TradeKickerCondition = "on_roster_date"
	TradeKickerMinutesThreshold TradeKickerCondition = "minutes_threshold"
	TradeKickerGamesPlayed     TradeKickerCondition = "games_played"
)

type TradeKicker struct {
	Condition TradeKickerCondition `json:"condition"`
	Threshold float64              `json:"threshold"`
	Amount    float64              `json:"amount"`
}

type DeferredMoney struct {
	Amount  float64 `json:"amount"`
	PayDate string  `json:"payDate"`
}

type Contract struct {
	SalaryByYear         []float64       `json:"salaryByYear"`
	YearsRemaining       int             `json:"yearsRemaining"`
	Option               ContractOption  `json:"option"`
	OptionYear           *int            `json:"optionYear"`
	NoTradeClause        bool            `json:"noTradeClause"`
	SigningBonusByYear   []float64       `json:"signingBonusByYear"`
	LikelyBonusesByYear  []float64       `json:"likelyBonusesByYear"`
	UnlikelyBonusesByYear []float64      `json:"unlikelyBonusesByYear"`
	Guaranteed           bool            `json:"guaranteed"`
	GuaranteedByYear     []bool          `json:"guaranteedByYear"`
	TradeKickers         []TradeKicker   `json:"tradeKickers"`
	PoisonPill           bool            `json:"poisonPill"`
	BirdRights           bool            `json:"birdRights"`
	EarlyBird            bool            `json:"earlyBird"`
	BaseYearCompensation bool            `json:"baseYearCompensation"`
	DeferredMoney        []DeferredMoney `json:"deferredMoney"`
}

func EmptyContract(salary float64, years int) Contract {
	if years <= 0 {
		years = 1
	}
	salaryByYear := make([]float64, years)
	signingBonusByYear := make([]float64, years)
	likelyBonusesByYear := make([]float64, years)
	unlikelyBonusesByYear := make([]float64, years)
	guaranteedByYear := make([]bool, years)

	for i := 0; i < years; i++ {
		salaryByYear[i] = salary
	}

	return Contract{
		SalaryByYear:          salaryByYear,
		YearsRemaining:        years,
		Option:                ContractOptionNone,
		OptionYear:            nil,
		NoTradeClause:         false,
		SigningBonusByYear:    signingBonusByYear,
		LikelyBonusesByYear:   likelyBonusesByYear,
		UnlikelyBonusesByYear: unlikelyBonusesByYear,
		Guaranteed:            false,
		GuaranteedByYear:      guaranteedByYear,
		TradeKickers:          []TradeKicker{},
		PoisonPill:            false,
		BirdRights:            false,
		EarlyBird:             false,
		BaseYearCompensation:  false,
		DeferredMoney:         []DeferredMoney{},
	}
}
