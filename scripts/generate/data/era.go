package data

import "dynasty-desk-gen/types"

func era(season string, pace, threePRate, tsPct, ppg, possCoeff float64) types.EraConfig {
	return types.EraConfig{
		Season:                season,
		Pace:                  pace,
		League3PARate:         threePRate,
		LeagueTsPct:           tsPct,
		LeaguePpg:             ppg,
		PossessionCoefficient: possCoeff,
	}
}

var late1990sEraBase = types.EraConfig{
	Pace:                  91.1,
	League3PARate:         0.18,
	LeagueTsPct:           0.52,
	LeaguePpg:             99.1,
	PossessionCoefficient: 0.92,
}

var mid2010sEraBase = types.EraConfig{
	Pace:                  95.8,
	League3PARate:         0.27,
	LeagueTsPct:           0.541,
	LeaguePpg:             102.7,
	PossessionCoefficient: 0.96,
}

var modernEraBase = types.EraConfig{
	Pace:                  99.2,
	League3PARate:         0.39,
	LeagueTsPct:           0.58,
	LeaguePpg:             114.7,
	PossessionCoefficient: 1.0,
}

func baseEraWithSeason(base types.EraConfig, season string) types.EraConfig {
	e := base
	e.Season = season
	return e
}

var HistoricalEraConfigs = map[string]types.EraConfig{
	"1990-91": {Season: "1990-91", Pace: 96.4, League3PARate: 0.1, LeagueTsPct: 0.521, LeaguePpg: 106.7, PossessionCoefficient: 0.92},
	"1991-92": {Season: "1991-92", Pace: 95.4, League3PARate: 0.11, LeagueTsPct: 0.521, LeaguePpg: 106.5, PossessionCoefficient: 0.92},
	"1992-93": {Season: "1992-93", Pace: 94.7, League3PARate: 0.12, LeagueTsPct: 0.52, LeaguePpg: 105.3, PossessionCoefficient: 0.92},
	"1993-94": {Season: "1993-94", Pace: 95.1, League3PARate: 0.13, LeagueTsPct: 0.518, LeaguePpg: 101.5, PossessionCoefficient: 0.92},
	"1994-95": {Season: "1994-95", Pace: 94.7, League3PARate: 0.15, LeagueTsPct: 0.526, LeaguePpg: 101.4, PossessionCoefficient: 0.92},
	"1995-96": {Season: "1995-96", Pace: 94.1, League3PARate: 0.17, LeagueTsPct: 0.525, LeaguePpg: 99.5, PossessionCoefficient: 0.92},
	"1996-97": {Season: "1996-97", Pace: 91.1, League3PARate: 0.18, LeagueTsPct: 0.52, LeaguePpg: 99.1, PossessionCoefficient: 0.92},
	"1997-98": {Season: "1997-98", Pace: 90.7, League3PARate: 0.18, LeagueTsPct: 0.523, LeaguePpg: 95.6, PossessionCoefficient: 0.92},
	"1998-99": {Season: "1998-99", Pace: 91.1, League3PARate: 0.18, LeagueTsPct: 0.511, LeaguePpg: 95.1, PossessionCoefficient: 0.62},
	"1999-00": {Season: "1999-00", Pace: 93.3, League3PARate: 0.19, LeagueTsPct: 0.52, LeaguePpg: 97.5, PossessionCoefficient: 0.92},
	"2000-01": {Season: "2000-01", Pace: 92.4, League3PARate: 0.19, LeagueTsPct: 0.514, LeaguePpg: 94.8, PossessionCoefficient: 0.92},
	"2001-02": {Season: "2001-02", Pace: 91.5, League3PARate: 0.21, LeagueTsPct: 0.514, LeaguePpg: 95.1, PossessionCoefficient: 0.92},
	"2002-03": {Season: "2002-03", Pace: 91.5, League3PARate: 0.22, LeagueTsPct: 0.519, LeaguePpg: 95.1, PossessionCoefficient: 0.92},
	"2003-04": {Season: "2003-04", Pace: 91.0, League3PARate: 0.22, LeagueTsPct: 0.515, LeaguePpg: 93.4, PossessionCoefficient: 0.92},
	"2004-05": {Season: "2004-05", Pace: 90.9, League3PARate: 0.23, LeagueTsPct: 0.529, LeaguePpg: 97.2, PossessionCoefficient: 0.92},
	"2005-06": {Season: "2005-06", Pace: 90.5, League3PARate: 0.24, LeagueTsPct: 0.531, LeaguePpg: 97.0, PossessionCoefficient: 0.92},
	"2006-07": {Season: "2006-07", Pace: 90.4, League3PARate: 0.25, LeagueTsPct: 0.535, LeaguePpg: 98.7, PossessionCoefficient: 0.92},
	"2007-08": {Season: "2007-08", Pace: 91.7, League3PARate: 0.26, LeagueTsPct: 0.54, LeaguePpg: 99.9, PossessionCoefficient: 0.92},
	"2008-09": {Season: "2008-09", Pace: 92.2, League3PARate: 0.27, LeagueTsPct: 0.541, LeaguePpg: 100.0, PossessionCoefficient: 0.92},
	"2009-10": {Season: "2009-10", Pace: 92.7, League3PARate: 0.27, LeagueTsPct: 0.541, LeaguePpg: 100.4, PossessionCoefficient: 0.92},
	"2010-11": {Season: "2010-11", Pace: 92.1, League3PARate: 0.27, LeagueTsPct: 0.543, LeaguePpg: 99.6, PossessionCoefficient: 0.92},
	"2011-12": {Season: "2011-12", Pace: 91.3, League3PARate: 0.26, LeagueTsPct: 0.527, LeaguePpg: 96.3, PossessionCoefficient: 0.81},
	"2012-13": baseEraWithSeason(mid2010sEraBase, "2012-13"),
	"2013-14": {Season: "2013-14", Pace: 93.5, League3PARate: 0.28, LeagueTsPct: 0.543, LeaguePpg: 101.0, PossessionCoefficient: 0.96},
	"2014-15": {Season: "2014-15", Pace: 93.5, League3PARate: 0.27, LeagueTsPct: 0.542, LeaguePpg: 100.0, PossessionCoefficient: 0.96},
	"2015-16": baseEraWithSeason(mid2010sEraBase, "2015-16"),
	"2016-17": {Season: "2016-17", Pace: 96.4, League3PARate: 0.31, LeagueTsPct: 0.554, LeaguePpg: 105.6, PossessionCoefficient: 0.96},
	"2017-18": {Season: "2017-18", Pace: 97.3, League3PARate: 0.33, LeagueTsPct: 0.557, LeaguePpg: 106.3, PossessionCoefficient: 0.96},
	"2018-19": {Season: "2018-19", Pace: 100.0, League3PARate: 0.36, LeagueTsPct: 0.561, LeaguePpg: 111.2, PossessionCoefficient: 0.96},
	"2019-20": {Season: "2019-20", Pace: 100.3, League3PARate: 0.38, LeagueTsPct: 0.565, LeaguePpg: 111.8, PossessionCoefficient: 0.92},
	"2020-21": {Season: "2020-21", Pace: 99.8, League3PARate: 0.39, LeagueTsPct: 0.572, LeaguePpg: 112.1, PossessionCoefficient: 0.92},
	"2021-22": {Season: "2021-22", Pace: 98.2, League3PARate: 0.39, LeagueTsPct: 0.566, LeaguePpg: 110.7, PossessionCoefficient: 1.0},
	"2022-23": {Season: "2022-23", Pace: 99.2, League3PARate: 0.4, LeagueTsPct: 0.581, LeaguePpg: 114.7, PossessionCoefficient: 1.0},
	"2023-24": {Season: "2023-24", Pace: 99.0, League3PARate: 0.4, LeagueTsPct: 0.581, LeaguePpg: 114.9, PossessionCoefficient: 1.0},
	"2024-25": baseEraWithSeason(modernEraBase, "2024-25"),
	"2025-26": baseEraWithSeason(modernEraBase, "2025-26"),
}

func GetEraConfig(season string) types.EraConfig {
	if cfg, ok := HistoricalEraConfigs[season]; ok {
		return cfg
	}
	return baseEraWithSeason(modernEraBase, "2024-25")
}
