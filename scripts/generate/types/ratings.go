package types

type PlayerRatings struct {
	InsideScoring    int `json:"insideScoring"`
	CloseShot        int `json:"closeShot"`
	Midrange         int `json:"midrange"`
	ThreePoint       int `json:"threePoint"`
	FreeThrow        int `json:"freeThrow"`
	BallHandling     int `json:"ballHandling"`
	Passing          int `json:"passing"`
	OffensiveIq      int `json:"offensiveIq"`
	OffensiveRebound int `json:"offensiveRebound"`
	DefensiveRebound int `json:"defensiveRebound"`
	PerimeterDefense int `json:"perimeterDefense"`
	InteriorDefense  int `json:"interiorDefense"`
	Steal            int `json:"steal"`
	Block            int `json:"block"`
	DefensiveIq      int `json:"defensiveIq"`
	Speed            int `json:"speed"`
	Strength         int `json:"strength"`
	Vertical         int `json:"vertical"`
	Stamina          int `json:"stamina"`
	Durability       int `json:"durability"`
	Clutch           int `json:"clutch"`
	Consistency      int `json:"consistency"`
	Potential        int `json:"potential"`
}

type PlayerTendencies struct {
	UsageRate                   float64 `json:"usageRate"`
	PassRate                    float64 `json:"passRate"`
	ShotRate                    float64 `json:"shotRate"`
	DriveRate                   float64 `json:"driveRate"`
	PostUpRate                  float64 `json:"postUpRate"`
	RimFrequency                float64 `json:"rimFrequency"`
	ShortMidFrequency           float64 `json:"shortMidFrequency"`
	LongMidFrequency            float64 `json:"longMidFrequency"`
	CornerThreeFrequency        float64 `json:"cornerThreeFrequency"`
	AboveBreakThreeFrequency    float64 `json:"aboveBreakThreeFrequency"`
	ThreePointRate              float64 `json:"threePointRate"`
	FreeThrowRate               float64 `json:"freeThrowRate"`
	TurnoverRate                float64 `json:"turnoverRate"`
	IsolationRate               float64 `json:"isolationRate"`
	PickAndRollBallHandlerRate  float64 `json:"pickAndRollBallHandlerRate"`
	PickAndRollRollManRate      float64 `json:"pickAndRollRollManRate"`
	SpotUpRate                  float64 `json:"spotUpRate"`
	TransitionRate              float64 `json:"transitionRate"`
	CutRate                     float64 `json:"cutRate"`
	FoulRate                    float64 `json:"foulRate"`
	StealAttemptRate            float64 `json:"stealAttemptRate"`
	BlockAttemptRate            float64 `json:"blockAttemptRate"`
	CrashOffensiveGlassRate     float64 `json:"crashOffensiveGlassRate"`
}

type PlayerTraits struct {
	WorkEthic            int `json:"workEthic"`
	Loyalty              int `json:"loyalty"`
	Ego                  int `json:"ego"`
	Greed                int `json:"greed"`
	Leadership           int `json:"leadership"`
	Coachability         int `json:"coachability"`
	InjuryRisk           int `json:"injuryRisk"`
	ShotCreation         int `json:"shotCreation"`
	DefensiveVersatility int `json:"defensiveVersatility"`
}

func ClampRating(value int) int {
	if value < 0 {
		return 0
	}
	if value > 100 {
		return 100
	}
	return value
}
