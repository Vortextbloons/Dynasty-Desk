package data

import "dynasty-desk-gen/types"

var DefaultLeagueRules = types.LeagueRules{
	SeasonLabel:            "2025-26",
	TeamCount:              30,
	RegularSeasonGames:     82,
	PlayoffTeamsPerConf:    8,
	PlayoffSeriesLength:    7,
	SalaryCapEnabled:       true,
	SalaryCap:              140_588_000,
	LuxuryTaxEnabled:       true,
	MaxRosterSize:          15,
	MinRosterSize:          13,
	MaxContractYears:       5,
	DraftRounds:            2,
	ThreePointLineDistance: 23.75,
	PlayoffFormat:          "playin_then_top8",
	HasPlayIn:              true,
	Apron:                  178_132_000,
	SecondApron:            189_502_000,
	LuxuryTaxLine:          171_314_000,
	LuxuryTaxRates: types.LuxuryTaxRates{
		NonTaxpayer: 1.5,
		Taxpayer:    1.75,
		Repeater:    2.5,
	},
	SecondApronTaxRate:     3.75,
	ApronPenaltyPerMillion: 1_000_000,
	MidLevelException:      12_800_000,
	BiAnnualException:      4_600_000,
	RoomMle:                7_700_000,
	MinimumPlayerSalary:    1_100_000,
	MinimumTeamSalary:      126_529_200,
	TradeExceptionYears:    1,
	AllowCashInTrades:      true,
	TwoWaySlots:            2,
	RookieScale:            "real",
	RookieDealYears:        4,
	RookieOptionYears:      2,
}

var HistoricalLeagueRules = map[string]types.LeagueRules{
	"1990-91": {RegularSeasonGames: 82, HasPlayIn: false, PlayoffFormat: "top8", ThreePointLineDistance: 23.0, SalaryCap: 11_871_000, MinimumPlayerSalary: 150_000},
	"1991-92": {RegularSeasonGames: 82, HasPlayIn: false, PlayoffFormat: "top8", SalaryCap: 12_500_000, MinimumPlayerSalary: 150_000},
	"1992-93": {RegularSeasonGames: 82, HasPlayIn: false, PlayoffFormat: "top8", SalaryCap: 14_000_000, MinimumPlayerSalary: 150_000},
	"1993-94": {RegularSeasonGames: 82, HasPlayIn: false, PlayoffFormat: "top8", SalaryCap: 15_175_000, MinimumPlayerSalary: 150_000},
	"1994-95": {RegularSeasonGames: 82, HasPlayIn: false, PlayoffFormat: "top8", SalaryCap: 15_964_000, MinimumPlayerSalary: 150_000},
	"1995-96": {RegularSeasonGames: 82, HasPlayIn: false, PlayoffFormat: "top8", ThreePointLineDistance: 22.0, SalaryCap: 24_363_000, MinimumPlayerSalary: 225_000},
	"1996-97": {RegularSeasonGames: 82, HasPlayIn: false, PlayoffFormat: "top8", SalaryCap: 26_900_000, MinimumPlayerSalary: 272_500},
	"1997-98": {RegularSeasonGames: 82, HasPlayIn: false, PlayoffFormat: "top8", SalaryCap: 26_900_000, MinimumPlayerSalary: 272_500},
	"1998-99": {RegularSeasonGames: 50, HasPlayIn: false, PlayoffFormat: "top8", SalaryCap: 30_000_000, MinimumPlayerSalary: 272_500},
	"1999-00": {RegularSeasonGames: 82, HasPlayIn: false, PlayoffFormat: "top8", SalaryCap: 31_991_000, MidLevelException: 3_000_000, MinimumPlayerSalary: 272_500},
	"2000-01": {RegularSeasonGames: 82, HasPlayIn: false, PlayoffFormat: "top8", SalaryCap: 35_500_000, MidLevelException: 4_200_000, MinimumPlayerSalary: 319_200},
	"2001-02": {RegularSeasonGames: 82, HasPlayIn: false, PlayoffFormat: "top8", SalaryCap: 42_500_000, LuxuryTaxLine: 48_200_000, MidLevelException: 4_500_000, MinimumPlayerSalary: 319_200},
	"2002-03": {RegularSeasonGames: 82, HasPlayIn: false, PlayoffFormat: "top8", SalaryCap: 42_500_000, MidLevelException: 4_905_000, MinimumPlayerSalary: 385_000},
	"2003-04": {RegularSeasonGames: 82, HasPlayIn: false, PlayoffFormat: "top8", SalaryCap: 43_870_000, LuxuryTaxLine: 52_150_000, MidLevelException: 4_905_000, MinimumPlayerSalary: 385_000},
	"2004-05": {RegularSeasonGames: 82, HasPlayIn: false, PlayoffFormat: "top8", SalaryCap: 43_840_000, LuxuryTaxLine: 52_150_000, MidLevelException: 4_905_000, MinimumPlayerSalary: 385_000},
	"2005-06": {RegularSeasonGames: 82, HasPlayIn: false, PlayoffFormat: "top8", SalaryCap: 49_500_000, LuxuryTaxLine: 61_700_000, MidLevelException: 5_215_000, BiAnnualException: 2_000_000, MinimumPlayerSalary: 398_000},
	"2006-07": {RegularSeasonGames: 82, HasPlayIn: false, PlayoffFormat: "top8", SalaryCap: 53_135_000, LuxuryTaxLine: 65_420_000, MidLevelException: 5_358_000, BiAnnualException: 2_100_000, MinimumPlayerSalary: 427_000},
	"2007-08": {RegularSeasonGames: 82, HasPlayIn: false, PlayoffFormat: "top8", SalaryCap: 55_630_000, LuxuryTaxLine: 67_860_000, MidLevelException: 5_585_000, BiAnnualException: 2_200_000, MinimumPlayerSalary: 442_000},
	"2008-09": {RegularSeasonGames: 82, HasPlayIn: false, PlayoffFormat: "top8", SalaryCap: 58_680_000, LuxuryTaxLine: 71_620_000, MidLevelException: 5_854_000, BiAnnualException: 2_300_000, MinimumPlayerSalary: 457_588},
	"2009-10": {RegularSeasonGames: 82, HasPlayIn: false, PlayoffFormat: "top8", SalaryCap: 57_700_000, LuxuryTaxLine: 69_920_000, MidLevelException: 5_765_000, BiAnnualException: 2_081_000, MinimumPlayerSalary: 473_604},
	"2010-11": {RegularSeasonGames: 82, HasPlayIn: false, PlayoffFormat: "top8", SalaryCap: 58_044_000, LuxuryTaxLine: 70_307_000, MidLevelException: 5_765_000, BiAnnualException: 2_081_000, MinimumPlayerSalary: 473_604},
	"2011-12": {RegularSeasonGames: 66, HasPlayIn: false, PlayoffFormat: "top8", SalaryCap: 58_044_000, LuxuryTaxLine: 70_307_000, MidLevelException: 5_765_000, BiAnnualException: 2_081_000, MinimumPlayerSalary: 473_604},
	"2012-13": {RegularSeasonGames: 82, HasPlayIn: false, PlayoffFormat: "top8", SalaryCap: 58_044_000, LuxuryTaxLine: 70_307_000, MidLevelException: 5_765_000, BiAnnualException: 2_081_000, MinimumPlayerSalary: 490_180},
	"2013-14": {RegularSeasonGames: 82, HasPlayIn: false, PlayoffFormat: "top8", SalaryCap: 58_679_000, LuxuryTaxLine: 71_748_000, MidLevelException: 5_150_000, BiAnnualException: 2_075_000, MinimumPlayerSalary: 490_180},
	"2014-15": {RegularSeasonGames: 82, HasPlayIn: false, PlayoffFormat: "top8", SalaryCap: 63_065_000, LuxuryTaxLine: 76_829_000, MidLevelException: 5_305_000, BiAnnualException: 2_139_000, MinimumPlayerSalary: 507_336},
	"2015-16": {RegularSeasonGames: 82, HasPlayIn: false, PlayoffFormat: "top8", SalaryCap: 70_000_000, LuxuryTaxLine: 84_700_000, MidLevelException: 5_464_000, BiAnnualException: 2_200_000, MinimumPlayerSalary: 525_093},
	"2016-17": {RegularSeasonGames: 82, HasPlayIn: false, PlayoffFormat: "top8", SalaryCap: 94_143_000, LuxuryTaxLine: 113_287_000, MidLevelException: 7_599_000, BiAnnualException: 2_814_000, MinimumPlayerSalary: 562_493},
	"2017-18": {RegularSeasonGames: 82, HasPlayIn: false, PlayoffFormat: "top8", SalaryCap: 99_093_000, LuxuryTaxLine: 119_266_000, MidLevelException: 8_406_000, BiAnnualException: 3_290_000, MinimumPlayerSalary: 815_615},
	"2018-19": {RegularSeasonGames: 82, HasPlayIn: false, PlayoffFormat: "top8", SalaryCap: 101_869_000, LuxuryTaxLine: 123_733_000, MidLevelException: 8_641_000, BiAnnualException: 3_382_000, MinimumPlayerSalary: 838_464},
	"2019-20": {RegularSeasonGames: 75, HasPlayIn: false, PlayoffFormat: "top8", SalaryCap: 109_140_000, LuxuryTaxLine: 132_627_000, MidLevelException: 9_258_000, BiAnnualException: 3_619_000, MinimumPlayerSalary: 898_310},
	"2020-21": {RegularSeasonGames: 72, HasPlayIn: true, PlayoffFormat: "playin_then_top8", SalaryCap: 109_140_000, LuxuryTaxLine: 132_627_000, MidLevelException: 9_258_000, BiAnnualException: 3_619_000, MinimumPlayerSalary: 898_310},
	"2021-22": {RegularSeasonGames: 82, HasPlayIn: true, PlayoffFormat: "playin_then_top8", SalaryCap: 112_414_000, Apron: 136_606_000, LuxuryTaxLine: 136_606_000, MidLevelException: 9_536_000, BiAnnualException: 3_732_000, MinimumPlayerSalary: 925_258},
	"2022-23": {RegularSeasonGames: 82, HasPlayIn: true, PlayoffFormat: "playin_then_top8", SalaryCap: 123_655_000, Apron: 150_267_000, SecondApron: 156_906_000, LuxuryTaxLine: 150_267_000, MidLevelException: 10_349_000, BiAnnualException: 4_105_000, RoomMle: 5_400_000, MinimumPlayerSalary: 963_972},
	"2023-24": {RegularSeasonGames: 82, HasPlayIn: true, PlayoffFormat: "playin_then_top8", SalaryCap: 136_021_000, Apron: 165_294_000, SecondApron: 172_346_000, LuxuryTaxLine: 165_294_000, MidLevelException: 12_200_000, BiAnnualException: 4_500_000, RoomMle: 5_500_000, MinimumPlayerSalary: 1_100_000},
	"2024-25": {RegularSeasonGames: 82, HasPlayIn: true, PlayoffFormat: "playin_then_top8", SalaryCap: 140_588_000, Apron: 178_132_000, SecondApron: 189_502_000, LuxuryTaxLine: 171_314_000, MidLevelException: 12_800_000, BiAnnualException: 4_600_000, RoomMle: 7_700_000, MinimumPlayerSalary: 1_100_000},
	"2025-26": {RegularSeasonGames: 82, HasPlayIn: true, PlayoffFormat: "playin_then_top8"},
}

func GetLeagueRules(season string) types.LeagueRules {
	rules := DefaultLeagueRules
	rules.SeasonLabel = season

	if overrides, ok := HistoricalLeagueRules[season]; ok {
		if overrides.RegularSeasonGames != 0 {
			rules.RegularSeasonGames = overrides.RegularSeasonGames
		}
		rules.HasPlayIn = overrides.HasPlayIn
		if overrides.PlayoffFormat != "" {
			rules.PlayoffFormat = overrides.PlayoffFormat
		}
		if overrides.ThreePointLineDistance != 0 {
			rules.ThreePointLineDistance = overrides.ThreePointLineDistance
		}
		if overrides.SalaryCap != 0 {
			rules.SalaryCap = overrides.SalaryCap
		}
		rules.Apron = overrides.Apron
		rules.SecondApron = overrides.SecondApron
		if overrides.LuxuryTaxLine != 0 {
			rules.LuxuryTaxLine = overrides.LuxuryTaxLine
		} else if season < "2001-02" {
			rules.LuxuryTaxLine = 0
		}
		if overrides.MidLevelException != 0 {
			rules.MidLevelException = overrides.MidLevelException
		} else if season < "1999-00" {
			rules.MidLevelException = 0
		}
		if overrides.BiAnnualException != 0 {
			rules.BiAnnualException = overrides.BiAnnualException
		} else if season < "2005-06" {
			rules.BiAnnualException = 0
		}
		rules.RoomMle = overrides.RoomMle
		if overrides.MinimumPlayerSalary != 0 {
			rules.MinimumPlayerSalary = overrides.MinimumPlayerSalary
		}
	}

	return rules
}
