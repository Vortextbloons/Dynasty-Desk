package main

import (
	"crypto/sha256"
	"encoding/binary"
	"fmt"
	"math"
	"math/rand"
	"os"
	"path/filepath"
	"runtime"
	"sort"
	"strings"
	"sync"
	"time"

	"dynasty-desk-gen/data"
	"dynasty-desk-gen/logic"
	"dynasty-desk-gen/types"
)

var PUBLIC_DATA string

func init() {
	_, thisFile, _, _ := runtime.Caller(0)
	PUBLIC_DATA = filepath.Join(filepath.Dir(thisFile), "..", "..", "public", "data")
}

func randInt(r *rand.Rand, min, max int) int {
	return r.Intn(max-min+1) + min
}

func clampFloat(v, min, max float64) float64 {
	if v < min {
		return min
	}
	if v > max {
		return max
	}
	return v
}

func clampInt(v, min, max int) int {
	if v < min {
		return min
	}
	if v > max {
		return max
	}
	return v
}

func seasonSeed(season string) int64 {
	h := sha256.Sum256([]byte("dynasty-desk:" + season))
	return int64(binary.BigEndian.Uint64(h[:8]))
}

type teamTemplate struct {
	Id           string
	City         string
	Name         string
	Abbreviation string
	Conference   string
	Division     string
	Colors       types.TeamColors
	MarketSize   int
	Prestige     int
	FanPatience  int
}

func generateTeams(season string, r *rand.Rand) []types.StaticTeam {
	templates := []teamTemplate{
		{Id: "team-bos", City: "Boston", Name: "Celtics", Abbreviation: "BOS", Conference: "East", Division: "Atlantic", Colors: types.TeamColors{Primary: "#007a33", Secondary: "#ba9653"}, MarketSize: 7, Prestige: 90, FanPatience: 75},
		{Id: "team-lal", City: "Los Angeles", Name: "Lakers", Abbreviation: "LAL", Conference: "West", Division: "Pacific", Colors: types.TeamColors{Primary: "#552583", Secondary: "#fdb927"}, MarketSize: 10, Prestige: 95, FanPatience: 60},
		{Id: "team-gsw", City: "Golden State", Name: "Warriors", Abbreviation: "GSW", Conference: "West", Division: "Pacific", Colors: types.TeamColors{Primary: "#1d428a", Secondary: "#ffc72c"}, MarketSize: 8, Prestige: 88, FanPatience: 70},
		{Id: "team-mil", City: "Milwaukee", Name: "Bucks", Abbreviation: "MIL", Conference: "East", Division: "Central", Colors: types.TeamColors{Primary: "#00471b", Secondary: "#eee1c6"}, MarketSize: 5, Prestige: 75, FanPatience: 70},
		{Id: "team-den", City: "Denver", Name: "Nuggets", Abbreviation: "DEN", Conference: "West", Division: "Northwest", Colors: types.TeamColors{Primary: "#0e2240", Secondary: "#fec524"}, MarketSize: 6, Prestige: 80, FanPatience: 75},
		{Id: "team-okc", City: "Oklahoma City", Name: "Thunder", Abbreviation: "OKC", Conference: "West", Division: "Northwest", Colors: types.TeamColors{Primary: "#007ac1", Secondary: "#ef3b24"}, MarketSize: 5, Prestige: 82, FanPatience: 80},
		{Id: "team-mia", City: "Miami", Name: "Heat", Abbreviation: "MIA", Conference: "East", Division: "Southeast", Colors: types.TeamColors{Primary: "#98002e", Secondary: "#f9a01b"}, MarketSize: 7, Prestige: 85, FanPatience: 65},
		{Id: "team-phi", City: "Philadelphia", Name: "76ers", Abbreviation: "PHI", Conference: "East", Division: "Atlantic", Colors: types.TeamColors{Primary: "#006bb6", Secondary: "#ed174c"}, MarketSize: 7, Prestige: 78, FanPatience: 60},
	}

	teams := make([]types.StaticTeam, len(templates))
	for i, t := range templates {
		owner := logic.DeriveOwner(types.StaticTeam{
			Id:       t.Id,
			Prestige: t.Prestige,
		}, i)
		teams[i] = types.StaticTeam{
			Id:           t.Id,
			City:         t.City,
			Name:         t.Name,
			Abbreviation: t.Abbreviation,
			Conference:   t.Conference,
			Division:     t.Division,
			Colors:       t.Colors,
			MarketSize:   t.MarketSize,
			Prestige:     t.Prestige,
			FanPatience:  t.FanPatience,
			Owner:        &owner,
			ImportMeta: &types.ImportMeta{
				SnapshotSeason: season,
				StatsSource:    "synthetic",
				LastUpdated:    "2026-01-01T00:00:00Z",
			},
		}
	}
	return teams
}

type playerProfile struct {
	Pos    types.Position
	Height int
	Weight int
	Age    int
}

func generatePlayers(teams []types.StaticTeam, season string, r *rand.Rand) []types.StaticPlayer {
	profiles := []playerProfile{
		{Pos: types.PositionPG, Height: 75, Weight: 190, Age: 27},
		{Pos: types.PositionSG, Height: 77, Weight: 205, Age: 26},
		{Pos: types.PositionSF, Height: 79, Weight: 220, Age: 28},
		{Pos: types.PositionPF, Height: 81, Weight: 240, Age: 28},
		{Pos: types.PositionC, Height: 83, Weight: 260, Age: 29},
	}

	firstNames := []string{
		"Luka", "Jayson", "Joel", "Giannis", "Nikola", "Shai", "Anthony", "Kawhi",
		"Devin", "Trae", "Donovan", "Tyrese", "Jaylen", "Paolo", "Cade", "Scottie",
		"Alperen", "Chet", "Franz", "Jalen",
	}
	lastNames := []string{
		"Doncic", "Tatum", "Embiid", "Antetokounmpo", "Jokic", "Gilgeous-Alexander",
		"Edwards", "Leonard", "Booker", "Young", "Mitchell", "Haliburton", "Brown",
		"Banchero", "Cunningham", "Barnes", "Sengun", "Holmgren", "Wagner", "Brunson",
	}

	var players []types.StaticPlayer
	idx := 0
	for _, team := range teams {
		for i := 0; i < 5; i++ {
			profile := profiles[i]
			fn := firstNames[(idx+i)%len(firstNames)]
			ln := lastNames[(idx+i)%len(lastNames)]

			rating := clampFloat(95-float64(idx)*0.4-float64(i)*0.8+float64(randInt(r, -2, 2)), 60, 99)
			ri := int(rating)
			isStar := idx < 4

			age := clampInt(profile.Age+randInt(r, -3, 3), 20, 38)
			teamId := team.Id
			playerId := fmt.Sprintf("p-%s-%d", strings.ToLower(team.Abbreviation), i+1)

			secPos := []types.Position{}
			if i == 0 {
				secPos = []types.Position{types.PositionSG}
			} else if i == 4 {
				secPos = []types.Position{types.PositionPF}
			}

			player := types.StaticPlayer{
				Id:                playerId,
				ExternalId:        fmt.Sprintf("%d", 10000+idx*10+i),
				FirstName:         fn,
				LastName:          ln,
				Age:               age,
				Position:          profile.Pos,
				SecondaryPositions: secPos,
				HeightInches:      profile.Height + randInt(r, -1, 1),
				WeightLbs:         profile.Weight + randInt(r, -5, 5),
				TeamId:            &teamId,
				Ratings: types.PlayerRatings{
					InsideScoring:    clampInt(ri+randInt(r, -5, 5), 50, 99),
					CloseShot:        clampInt(ri+randInt(r, -5, 5), 50, 99),
					Midrange:         clampInt(ri+randInt(r, -8, 5), 50, 99),
					ThreePoint:       clampInt(ri+randInt(r, -10, 5), 50, 99),
					FreeThrow:        clampInt(ri+randInt(r, -8, 5), 50, 99),
					BallHandling:     clampInt(ri+randInt(r, -8, 5), 50, 99),
					Passing:          clampInt(ri+randInt(r, -5, 5), 50, 99),
					OffensiveIq:      clampInt(ri+randInt(r, -3, 3), 50, 99),
					OffensiveRebound: clampInt(ri-10+randInt(r, -8, 8), 40, 99),
					DefensiveRebound: clampInt(ri-5+randInt(r, -8, 8), 40, 99),
					PerimeterDefense: clampInt(ri+randInt(r, -10, 5), 45, 99),
					InteriorDefense:  clampInt(ri+randInt(r, -10, 5), 45, 99),
					Steal:            clampInt(ri+randInt(r, -8, 8), 45, 99),
					Block:            clampInt(ri-5+randInt(r, -8, 8), 40, 99),
					DefensiveIq:      clampInt(ri+randInt(r, -5, 5), 50, 99),
					Speed:            clampInt(ri+randInt(r, -8, 5), 50, 99),
					Strength:         clampInt(ri+randInt(r, -5, 5), 50, 99),
					Vertical:         clampInt(ri+randInt(r, -8, 8), 50, 99),
					Stamina:          clampInt(ri+randInt(r, -3, 3), 50, 99),
					Durability:       clampInt(ri+randInt(r, -5, 5), 50, 99),
					Clutch:           clampInt(ri+randInt(r, -3, 3), 50, 99),
					Consistency:      clampInt(ri+randInt(r, -3, 3), 50, 99),
					Potential:        clampInt(ri+boolToInt(isStar)*5+randInt(r, -3, 3), 50, 99),
				},
				Tendencies: types.PlayerTendencies{
					UsageRate:                  clampFloat(20+float64(boolToInt(isStar))*8+float64(randInt(r, -3, 3)), 10, 40),
					PassRate:                   clampFloat(15+float64(boolToInt(profile.Pos == types.PositionPG))*10+float64(randInt(r, -3, 3)), 5, 35),
					ShotRate:                   clampFloat(25+float64(boolToInt(isStar))*5+float64(randInt(r, -3, 3)), 10, 50),
					DriveRate:                  clampFloat(10+float64(boolToInt(profile.Pos == types.PositionPG))*8+float64(randInt(r, -3, 3)), 5, 35),
					PostUpRate:                 clampFloat(5+float64(boolToInt(profile.Pos == types.PositionC || profile.Pos == types.PositionPF))*8+float64(randInt(r, -2, 2)), 0, 30),
					RimFrequency:               clampFloat(25+float64(randInt(r, -5, 5)), 10, 50),
					ShortMidFrequency:          clampFloat(15+float64(randInt(r, -3, 3)), 5, 30),
					LongMidFrequency:           clampFloat(10+float64(randInt(r, -3, 3)), 0, 20),
					CornerThreeFrequency:       clampFloat(5+float64(randInt(r, -2, 2)), 0, 15),
					AboveBreakThreeFrequency:   clampFloat(15+float64(randInt(r, -3, 3)), 5, 30),
					ThreePointRate:             clampFloat(30+float64(randInt(r, -5, 10)), 15, 60),
					FreeThrowRate:              clampFloat(25+float64(randInt(r, -3, 3)), 10, 50),
					TurnoverRate:               clampFloat(12+float64(randInt(r, -2, 4)), 5, 25),
					IsolationRate:              clampFloat(10+float64(boolToInt(isStar))*8+float64(randInt(r, -3, 3)), 0, 35),
					PickAndRollBallHandlerRate: clampFloat(20+float64(boolToInt(profile.Pos == types.PositionPG))*15+float64(randInt(r, -3, 3)), 5, 50),
					PickAndRollRollManRate:     clampFloat(10+float64(boolToInt(profile.Pos == types.PositionC))*15+float64(randInt(r, -3, 3)), 0, 30),
					SpotUpRate:                 clampFloat(20+float64(randInt(r, -3, 3)), 5, 40),
					TransitionRate:             clampFloat(15+float64(randInt(r, -3, 3)), 5, 30),
					CutRate:                    clampFloat(10+float64(randInt(r, -2, 2)), 0, 25),
					FoulRate:                   clampFloat(2+float64(randInt(r, -1, 1)), 0, 6),
					StealAttemptRate:           clampFloat(5+float64(randInt(r, -2, 2)), 0, 12),
					BlockAttemptRate:           clampFloat(5+float64(randInt(r, -2, 2)), 0, 12),
					CrashOffensiveGlassRate:    clampFloat(10+float64(randInt(r, -3, 3)), 0, 25),
				},
				Traits: types.PlayerTraits{
					WorkEthic:            clampInt(50+randInt(r, -10, 10), 30, 99),
					Loyalty:              clampInt(50+randInt(r, -10, 10), 20, 99),
					Ego:                  clampInt(50+randInt(r, -10, 10), 20, 99),
					Greed:                clampInt(50+randInt(r, -10, 10), 20, 99),
					Leadership:           clampInt(50+randInt(r, -10, 10), 20, 99),
					Coachability:         clampInt(50+randInt(r, -10, 10), 20, 99),
					InjuryRisk:           clampInt(50+randInt(r, -10, 10), 10, 99),
					ShotCreation:         clampInt(ri+randInt(r, -5, 5), 50, 99),
					DefensiveVersatility: clampInt(ri+randInt(r, -5, 5), 50, 99),
				},
				Contract: types.EmptyContract(0, 1),
				ImportMeta: &types.ImportMeta{
					SnapshotSeason: season,
					StatsSource:    "synthetic",
					LastUpdated:    "2026-01-01T00:00:00Z",
				},
			}
			players = append(players, player)
			idx++
		}
	}

	rules := data.GetLeagueRules(season)
	for i := range players {
		players[i].Contract = logic.DeriveContract(players[i], rules, season)
	}

	return players
}

func boolToInt(b bool) int {
	if b {
		return 1
	}
	return 0
}

func generateSeasonStats(players []types.StaticPlayer, season string, r *rand.Rand) []types.PlayerSeasonStats {
	stats := make([]types.PlayerSeasonStats, len(players))
	for i, p := range players {
		gp := randInt(r, 55, 78)
		mpg := clampFloat(28+float64(p.Ratings.Consistency-70)*0.4, 18, 38)
		minutes := int(math.Round(mpg * float64(gp)))
		usage := p.Tendencies.UsageRate / 100
		ppg := clampFloat(8+usage*28+float64(p.Ratings.OffensiveIq-70)*0.2, 4, 33)
		points := int(math.Round(ppg * float64(gp)))
		rpg := clampFloat(2+float64(p.Ratings.DefensiveRebound)*0.05+
			func() float64 {
				if p.Position == types.PositionC {
					return 3
				}
				return 0
			}()+
			func() float64 {
				if p.Position == types.PositionPF {
					return 1.5
				}
				return 0
			}(), 1, 14)
		apg := clampFloat(1+p.Tendencies.PassRate*0.18, 0.5, 11)
		spg := clampFloat(0.4+float64(p.Ratings.Steal)*0.015, 0.2, 2.5)
		bpg := clampFloat(0.2+float64(p.Ratings.Block)*0.015, 0, 3)
		topg := clampFloat(0.8+p.Tendencies.TurnoverRate*0.05, 0.4, 4.5)
		fga := int(math.Round(
			(ppg / clampFloat(0.45+float64(p.Ratings.ThreePoint)*0.0008+float64(p.Ratings.InsideScoring)*0.0008, 0.3, 0.65)) * float64(gp),
		))
		fgm := int(math.Round(float64(fga) * clampFloat(0.42+float64(p.Ratings.InsideScoring-70)*0.005, 0.32, 0.62)))
		tpa := int(math.Round(float64(fga) * clampFloat(0.25+float64(p.Ratings.ThreePoint)*0.0035, 0.1, 0.6)))
		tpm := int(math.Round(float64(tpa) * clampFloat(0.28+float64(p.Ratings.ThreePoint-60)*0.008, 0.18, 0.48)))
		fta := int(math.Round(float64(fga) * clampFloat(0.18+float64(p.Ratings.InsideScoring)*0.0025, 0.1, 0.55)))
		ftm := int(math.Round(float64(fta) * clampFloat(0.65+float64(p.Ratings.FreeThrow)*0.0035, 0.45, 0.93)))
		tsPct := float64(points) / (2 * (float64(fga) + 0.44*float64(fta)))
		clampedTsPct := clampFloat(tsPct, 0.4, 0.7)
		efgPct := clampFloat((float64(fgm)+0.5*float64(tpm))/float64(fga), 0.35, 0.65)

		roundedTsPct := math.Round(clampedTsPct*1000) / 1000
		roundedEfgPct := math.Round(efgPct*1000) / 1000

		rebounds := int(math.Round(rpg * float64(gp)))

		stats[i] = types.PlayerSeasonStats{
			PlayerId:          p.Id,
			Season:            season,
			TeamId:            p.TeamId,
			GamesPlayed:       gp,
			Minutes:           minutes,
			Starts:            int(math.Round(float64(gp) * 0.85)),
			Points:            points,
			Rebounds:          rebounds,
			OffensiveRebounds: int(math.Round(float64(rebounds) * 0.25)),
			DefensiveRebounds: int(math.Round(float64(rebounds) * 0.75)),
			Assists:           int(math.Round(apg * float64(gp))),
			Steals:            int(math.Round(spg * float64(gp))),
			Blocks:            int(math.Round(bpg * float64(gp))),
			Turnovers:         int(math.Round(topg * float64(gp))),
			Fouls:             int(math.Round(2 * float64(gp))),
			Fgm:               fgm,
			Fga:               fga,
			Tpm:               tpm,
			Tpa:               tpa,
			Ftm:               ftm,
			Fta:               fta,
			TsPct:             roundedTsPct,
			EfgPct:            roundedEfgPct,
			Per:               clampFloat(8+float64(p.Ratings.OffensiveIq)*0.18, 5, 32),
			UsageRate:         p.Tendencies.UsageRate,
			WinShares:         clampFloat(float64(gp)*0.07+float64(p.Ratings.OffensiveIq)*0.04, -1, 16),
			BoxPlusMinus:      clampFloat(float64(p.Ratings.OffensiveIq)*0.06+float64(p.Ratings.DefensiveIq)*0.04-8, -6, 12),
			Vorp:              clampFloat(float64(gp)*0.012+float64(p.Ratings.OffensiveIq)*0.02-1, -2, 8),
		}
	}
	return stats
}

func eraConfigFor(season string) types.EraConfig {
	if cfg, ok := data.HistoricalEraConfigs[season]; ok {
		return cfg
	}
	return data.HistoricalEraConfigs["2024-25"]
}

func generateSeasonSnapshot(season string) error {
	r := rand.New(rand.NewSource(seasonSeed(season)))
	teams := generateTeams(season, r)
	players := generatePlayers(teams, season, r)
	seasonStats := generateSeasonStats(players, season, r)

	base := filepath.Join(PUBLIC_DATA, "nba", season)

	if err := writeJSON(filepath.Join(base, "teams.json"), teams); err != nil {
		return err
	}
	if err := writeJSON(filepath.Join(base, "roster.json"), players); err != nil {
		return err
	}
	if err := writeJSON(filepath.Join(base, "season-stats.json"), seasonStats); err != nil {
		return err
	}

	careerStats := make([]types.PlayerCareerStats, len(players))
	for i, p := range players {
		var playerStats []types.PlayerSeasonStats
		for _, s := range seasonStats {
			if s.PlayerId == p.Id {
				playerStats = append(playerStats, s)
			}
		}
		careerStats[i] = types.ComputeCareerStats(p.Id, playerStats, types.EmptyAccolades())
	}
	if err := writeJSON(filepath.Join(base, "career-stats.json"), careerStats); err != nil {
		return err
	}

	if err := writeJSON(filepath.Join(base, "era-config.json"), eraConfigFor(season)); err != nil {
		return err
	}

	fmt.Printf("[synthetic] wrote %s/\n", base)
	return nil
}

func generateShared() error {
	base := filepath.Join(PUBLIC_DATA, "shared")
	awards := []types.AwardWinner{}

	champions := make([]types.Champion, len(data.ChampionsHistory))
	for i, c := range data.ChampionsHistory {
		champions[i] = types.Champion{
			Season:            c.Season,
			ChampionTeamId:    fmt.Sprintf("team-%s", strings.ToLower(c.ChampionAbbrev)),
			RunnerUpTeamId:    fmt.Sprintf("team-%s", strings.ToLower(c.RunnerUpAbbrev)),
			FinalsMvpPlayerId: "unknown",
			SeriesResult:      c.SeriesResult,
		}
	}

	if err := writeJSON(filepath.Join(base, "awards-history.json"), map[string]interface{}{
		"version":   "0.2.0",
		"updatedAt": "2026-01-01T00:00:00Z",
		"awards":    awards,
	}); err != nil {
		return err
	}
	if err := writeJSON(filepath.Join(base, "champions.json"), map[string]interface{}{
		"version":   "0.2.0",
		"updatedAt": "2026-01-01T00:00:00Z",
		"champions": champions,
	}); err != nil {
		return err
	}
	if err := writeJSON(filepath.Join(base, "league-rules.json"), data.GetLeagueRules("2025-26")); err != nil {
		return err
	}
	if err := writeJSON(filepath.Join(base, "name-pools.json"), map[string]interface{}{
		"firstNames": []string{},
		"lastNames":  []string{},
	}); err != nil {
		return err
	}
	if err := writeJSON(filepath.Join(base, "player-archetypes.json"), map[string]interface{}{
		"archetypes": []string{},
	}); err != nil {
		return err
	}

	fmt.Printf("[synthetic] wrote %s/\n", base)
	return nil
}

func generateManifest() error {
	seasons := make([]string, 0, len(data.HistoricalEraConfigs))
	for s := range data.HistoricalEraConfigs {
		seasons = append(seasons, s)
	}
	sort.Strings(seasons)

	snapshots := make([]types.DataManifestEntry, len(seasons))
	for i, s := range seasons {
		startYear := 2025
		parts := strings.SplitN(s, "-", 2)
		if len(parts) == 2 {
			fmt.Sscanf(parts[0], "%d", &startYear)
		}
		snapshots[i] = types.DataManifestEntry{
			Id:          fmt.Sprintf("nba-%s", s),
			Name:        fmt.Sprintf("NBA %s", s),
			Type:        "nba",
			SeasonLabel: s,
			StartYear:   startYear,
			BasePath:    fmt.Sprintf("/data/nba/%s", s),
			TeamCount:   8,
			PlayerCount: 40,
		}
	}

	manifest := types.DataManifest{
		Version:           "0.2.0",
		DefaultSnapshotId: "nba-2025-26",
		Snapshots:         snapshots,
	}

	if err := writeJSON(filepath.Join(PUBLIC_DATA, "manifest.json"), manifest); err != nil {
		return err
	}

	fmt.Printf("[synthetic] wrote %s/manifest.json (%d snapshots)\n", PUBLIC_DATA, len(snapshots))
	return nil
}

func main() {
	start := time.Now()

	seasons := make([]string, 0, len(data.HistoricalEraConfigs))
	for s := range data.HistoricalEraConfigs {
		seasons = append(seasons, s)
	}
	sort.Strings(seasons)

	workers := runtime.NumCPU()
	if workers > len(seasons) {
		workers = len(seasons)
	}

	seasonCh := make(chan string, len(seasons))
	for _, s := range seasons {
		seasonCh <- s
	}
	close(seasonCh)

	var wg sync.WaitGroup
	firstErr := make(chan error, 1)

	for i := 0; i < workers; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for season := range seasonCh {
				select {
				case <-firstErr:
					return
				default:
				}
				if err := generateSeasonSnapshot(season); err != nil {
					select {
					case firstErr <- err:
					default:
					}
					return
				}
			}
		}()
	}

	wg.Wait()
	close(firstErr)

	if err := <-firstErr; err != nil {
		fmt.Fprintf(os.Stderr, "Error: %v\n", err)
		os.Exit(1)
	}

	if err := generateShared(); err != nil {
		fmt.Fprintf(os.Stderr, "Error generating shared: %v\n", err)
		os.Exit(1)
	}

	if err := generateManifest(); err != nil {
		fmt.Fprintf(os.Stderr, "Error generating manifest: %v\n", err)
		os.Exit(1)
	}

	fmt.Printf("done in %v\n", time.Since(start))
}
