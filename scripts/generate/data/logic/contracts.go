package logic

import (
	"dynasty-desk-gen/types"
	"math"
)

func ComputeOverallRating(player types.StaticPlayer) int {
	r := player.Ratings
	sum := r.InsideScoring + r.CloseShot + r.Midrange + r.ThreePoint +
		r.FreeThrow + r.BallHandling + r.Passing + r.OffensiveIq +
		r.OffensiveRebound + r.DefensiveRebound + r.PerimeterDefense +
		r.InteriorDefense + r.Steal + r.Block + r.DefensiveIq +
		r.Speed + r.Strength + r.Vertical + r.Stamina + r.Durability +
		r.Clutch + r.Consistency + r.Potential
	return int(math.Round(float64(sum) / 23.0))
}

func DeriveContract(player types.StaticPlayer, rules types.LeagueRules, snapshotSeason string) types.Contract {
	_ = rules
	_ = snapshotSeason

	overall := ComputeOverallRating(player)
	baseSalary := GetBaseSalary(overall)
	yearsInLeague := player.Age - 18
	if yearsInLeague < 1 {
		yearsInLeague = 1
	}
	years := GetContractYears(yearsInLeague)

	salaryByYear := make([]float64, years)
	for i := 0; i < years; i++ {
		salaryByYear[i] = math.Round(baseSalary * math.Pow(1+AnnualRaisePct, float64(i)))
	}

	guaranteed := years <= 3
	guaranteedByYear := make([]bool, years)
	for i := 0; i < years; i++ {
		if years <= 3 {
			guaranteedByYear[i] = true
		} else {
			guaranteedByYear[i] = i < years-1
		}
	}

	signingBonusPerYear := math.Round((baseSalary * 0.05) / float64(years))
	signingBonusByYear := make([]float64, years)
	for i := 0; i < years; i++ {
		signingBonusByYear[i] = signingBonusPerYear
	}

	option := types.ContractOptionNone
	var optionYear *int
	if years >= 4 {
		option = types.ContractOptionPlayer
		optY := years
		optionYear = &optY
	}

	birdRights := yearsInLeague >= 7
	earlyBird := yearsInLeague >= 4

	return types.Contract{
		SalaryByYear:          salaryByYear,
		YearsRemaining:        years,
		Option:                option,
		OptionYear:            optionYear,
		NoTradeClause:         false,
		SigningBonusByYear:    signingBonusByYear,
		LikelyBonusesByYear:   make([]float64, years),
		UnlikelyBonusesByYear: make([]float64, years),
		Guaranteed:            guaranteed,
		GuaranteedByYear:      guaranteedByYear,
		TradeKickers:          []types.TradeKicker{},
		PoisonPill:            false,
		BirdRights:            birdRights,
		EarlyBird:             earlyBird,
		BaseYearCompensation:  false,
		DeferredMoney:         []types.DeferredMoney{},
	}
}
