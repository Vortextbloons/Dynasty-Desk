package types

type EraConfig struct {
	Season               string  `json:"season"`
	Pace                 float64 `json:"pace"`
	League3PARate        float64 `json:"league3PARate"`
	LeagueTsPct          float64 `json:"leagueTsPct"`
	LeaguePpg            float64 `json:"leaguePpg"`
	PossessionCoefficient float64 `json:"possessionCoefficient"`
}
