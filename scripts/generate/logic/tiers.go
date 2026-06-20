package logic

type SalaryTier struct {
	MinOverall int
	Salary     float64
}

var SalaryTiers = []SalaryTier{
	{MinOverall: 95, Salary: 65_000_000},
	{MinOverall: 90, Salary: 55_000_000},
	{MinOverall: 85, Salary: 45_000_000},
	{MinOverall: 80, Salary: 35_000_000},
	{MinOverall: 75, Salary: 26_000_000},
	{MinOverall: 70, Salary: 18_000_000},
	{MinOverall: 65, Salary: 12_000_000},
	{MinOverall: 60, Salary: 7_000_000},
	{MinOverall: 55, Salary: 3_000_000},
	{MinOverall: 50, Salary: 1_500_000},
}

const AnnualRaisePct = 0.08

func GetBaseSalary(overallRating int) float64 {
	clamped := overallRating
	if clamped < 0 {
		clamped = 0
	}
	if clamped > 100 {
		clamped = 100
	}
	for _, tier := range SalaryTiers {
		if clamped >= tier.MinOverall {
			return tier.Salary
		}
	}
	return 1_500_000
}

func GetContractYears(yearsInLeague int) int {
	if yearsInLeague <= 3 {
		return 1
	}
	if yearsInLeague <= 6 {
		return 2
	}
	return 4
}
