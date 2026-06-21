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
	"dynasty-desk-gen/data/logic"
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
	ExternalId   string
	City         string
	Name         string
	Abbreviation string
	Conference   string
	Division     string
	Colors       types.TeamColors
	Arena        string
	Capacity     int
	MarketSize   int
	Prestige     int
	FanPatience  int
}

var playerNameToId = map[string]string{
	"Luka Doncic":             "1629029",
	"Jayson Tatum":            "1628369",
	"Joel Embiid":             "203954",
	"Giannis Antetokounmpo":   "203507",
	"Nikola Jokic":            "203999",
	"Shai Gilgeous-Alexander": "1628983",
	"Anthony Edwards":         "1630169",
	"Kawhi Leonard":           "6450",
	"Devin Booker":            "1626164",
	"Trae Young":              "1628973",
	"Donovan Mitchell":        "1628378",
	"Tyrese Haliburton":       "1630169",
	"Jaylen Brown":            "1627759",
	"Paolo Banchero":          "1631000",
	"Cade Cunningham":         "1630596",
	"Scottie Barnes":          "1631104",
	"Alperen Sengun":          "1630596",
	"Chet Holmgren":           "1631096",
	"Franz Wagner":            "1630596",
	"Jalen Brunson":           "1628973",
}

func generateTeams(season string, r *rand.Rand) []types.StaticTeam {
	templates := []teamTemplate{
		{Id: "team-bos", ExternalId: "1610612738", City: "Boston", Name: "Celtics", Abbreviation: "BOS", Conference: "East", Division: "Atlantic", Colors: types.TeamColors{Primary: "#007a33", Secondary: "#ba9653"}, Arena: "TD Garden", Capacity: 19156, MarketSize: 8, Prestige: 90, FanPatience: 75},
		{Id: "team-lal", ExternalId: "1610612747", City: "Los Angeles", Name: "Lakers", Abbreviation: "LAL", Conference: "West", Division: "Pacific", Colors: types.TeamColors{Primary: "#552583", Secondary: "#fdb927"}, Arena: "Crypto.com Arena", Capacity: 18997, MarketSize: 10, Prestige: 95, FanPatience: 60},
		{Id: "team-gsw", ExternalId: "1610612744", City: "Golden State", Name: "Warriors", Abbreviation: "GSW", Conference: "West", Division: "Pacific", Colors: types.TeamColors{Primary: "#1d428a", Secondary: "#ffc72c"}, Arena: "Chase Center", Capacity: 18064, MarketSize: 9, Prestige: 88, FanPatience: 70},
		{Id: "team-mil", ExternalId: "1610612749", City: "Milwaukee", Name: "Bucks", Abbreviation: "MIL", Conference: "East", Division: "Central", Colors: types.TeamColors{Primary: "#00471b", Secondary: "#eee1c6"}, Arena: "Fiserv Forum", Capacity: 17341, MarketSize: 4, Prestige: 75, FanPatience: 70},
		{Id: "team-den", ExternalId: "1610612743", City: "Denver", Name: "Nuggets", Abbreviation: "DEN", Conference: "West", Division: "Northwest", Colors: types.TeamColors{Primary: "#0e2240", Secondary: "#fec524"}, Arena: "Ball Arena", Capacity: 19520, MarketSize: 5, Prestige: 80, FanPatience: 75},
		{Id: "team-okc", ExternalId: "1610612760", City: "Oklahoma City", Name: "Thunder", Abbreviation: "OKC", Conference: "West", Division: "Northwest", Colors: types.TeamColors{Primary: "#007ac1", Secondary: "#ef3b24"}, Arena: "Paycom Center", Capacity: 18203, MarketSize: 3, Prestige: 82, FanPatience: 80},
		{Id: "team-mia", ExternalId: "1610612748", City: "Miami", Name: "Heat", Abbreviation: "MIA", Conference: "East", Division: "Southeast", Colors: types.TeamColors{Primary: "#98002e", Secondary: "#f9a01b"}, Arena: "Kaseya Center", Capacity: 19600, MarketSize: 8, Prestige: 85, FanPatience: 65},
		{Id: "team-phi", ExternalId: "1610612755", City: "Philadelphia", Name: "76ers", Abbreviation: "PHI", Conference: "East", Division: "Atlantic", Colors: types.TeamColors{Primary: "#006bb6", Secondary: "#ed174c"}, Arena: "Wells Fargo Center", Capacity: 20478, MarketSize: 7, Prestige: 78, FanPatience: 60},
		{Id: "team-bkn", ExternalId: "1610612751", City: "Brooklyn", Name: "Nets", Abbreviation: "BKN", Conference: "East", Division: "Atlantic", Colors: types.TeamColors{Primary: "#000000", Secondary: "#ffffff"}, Arena: "Barclays Center", Capacity: 17732, MarketSize: 10, Prestige: 60, FanPatience: 50},
		{Id: "team-nyk", ExternalId: "1610612752", City: "New York", Name: "Knicks", Abbreviation: "NYK", Conference: "East", Division: "Atlantic", Colors: types.TeamColors{Primary: "#006bb6", Secondary: "#f58426"}, Arena: "Madison Square Garden", Capacity: 19812, MarketSize: 10, Prestige: 80, FanPatience: 55},
		{Id: "team-chi", ExternalId: "1610612741", City: "Chicago", Name: "Bulls", Abbreviation: "CHI", Conference: "East", Division: "Central", Colors: types.TeamColors{Primary: "#ce1141", Secondary: "#000000"}, Arena: "United Center", Capacity: 20917, MarketSize: 9, Prestige: 75, FanPatience: 60},
		{Id: "team-atl", ExternalId: "1610612737", City: "Atlanta", Name: "Hawks", Abbreviation: "ATL", Conference: "East", Division: "Southeast", Colors: types.TeamColors{Primary: "#e03a3e", Secondary: "#c1d32f"}, Arena: "State Farm Arena", Capacity: 18118, MarketSize: 7, Prestige: 65, FanPatience: 55},
		{Id: "team-cle", ExternalId: "1610612739", City: "Cleveland", Name: "Cavaliers", Abbreviation: "CLE", Conference: "East", Division: "Central", Colors: types.TeamColors{Primary: "#860038", Secondary: "#fdbb30"}, Arena: "Rocket Mortgage FieldHouse", Capacity: 19432, MarketSize: 5, Prestige: 70, FanPatience: 65},
		{Id: "team-det", ExternalId: "1610612765", City: "Detroit", Name: "Pistons", Abbreviation: "DET", Conference: "East", Division: "Central", Colors: types.TeamColors{Primary: "#c8102e", Secondary: "#1d42ba"}, Arena: "Little Caesars Arena", Capacity: 20332, MarketSize: 6, Prestige: 60, FanPatience: 55},
		{Id: "team-ind", ExternalId: "1610612754", City: "Indiana", Name: "Pacers", Abbreviation: "IND", Conference: "East", Division: "Central", Colors: types.TeamColors{Primary: "#002d62", Secondary: "#fdbb30"}, Arena: "Gainbridge Fieldhouse", Capacity: 17923, MarketSize: 4, Prestige: 65, FanPatience: 65},
		{Id: "team-mem", ExternalId: "1610612763", City: "Memphis", Name: "Grizzlies", Abbreviation: "MEM", Conference: "West", Division: "Southwest", Colors: types.TeamColors{Primary: "#5d76a9", Secondary: "#12173f"}, Arena: "FedExForum", Capacity: 17794, MarketSize: 3, Prestige: 75, FanPatience: 70},
		{Id: "team-uta", ExternalId: "1610612762", City: "Utah", Name: "Jazz", Abbreviation: "UTA", Conference: "West", Division: "Northwest", Colors: types.TeamColors{Primary: "#002b5c", Secondary: "#f9a01b"}, Arena: "Delta Center", Capacity: 18306, MarketSize: 3, Prestige: 65, FanPatience: 60},
		{Id: "team-tor", ExternalId: "1610612761", City: "Toronto", Name: "Raptors", Abbreviation: "TOR", Conference: "East", Division: "Atlantic", Colors: types.TeamColors{Primary: "#ce1141", Secondary: "#000000"}, Arena: "Scotiabank Arena", Capacity: 19800, MarketSize: 7, Prestige: 65, FanPatience: 55},
		{Id: "team-min", ExternalId: "1610612750", City: "Minnesota", Name: "Timberwolves", Abbreviation: "MIN", Conference: "West", Division: "Northwest", Colors: types.TeamColors{Primary: "#0c2340", Secondary: "#236192"}, Arena: "Target Center", Capacity: 18798, MarketSize: 4, Prestige: 75, FanPatience: 70},
		{Id: "team-port", ExternalId: "1610612757", City: "Portland", Name: "Trail Blazers", Abbreviation: "POR", Conference: "West", Division: "Northwest", Colors: types.TeamColors{Primary: "#00788c", Secondary: "#e56020"}, Arena: "Moda Center", Capacity: 19441, MarketSize: 4, Prestige: 60, FanPatience: 60},
		{Id: "team-sac", ExternalId: "1610612758", City: "Sacramento", Name: "Kings", Abbreviation: "SAC", Conference: "West", Division: "Pacific", Colors: types.TeamColors{Primary: "#5d2d92", Secondary: "#63727a"}, Arena: "Golden 1 Center", Capacity: 17608, MarketSize: 4, Prestige: 70, FanPatience: 65},
		{Id: "team-phx", ExternalId: "1610612756", City: "Phoenix", Name: "Suns", Abbreviation: "PHX", Conference: "West", Division: "Pacific", Colors: types.TeamColors{Primary: "#1d1160", Secondary: "#e56020"}, Arena: "Footprint Center", Capacity: 18055, MarketSize: 6, Prestige: 75, FanPatience: 60},
		{Id: "team-lac", ExternalId: "1610612746", City: "Los Angeles", Name: "Clippers", Abbreviation: "LAC", Conference: "West", Division: "Pacific", Colors: types.TeamColors{Primary: "#c8102e", Secondary: "#000000"}, Arena: "Intuit Dome", Capacity: 18000, MarketSize: 10, Prestige: 70, FanPatience: 55},
		{Id: "team-dal", ExternalId: "1610612742", City: "Dallas", Name: "Mavericks", Abbreviation: "DAL", Conference: "West", Division: "Southwest", Colors: types.TeamColors{Primary: "#00538c", Secondary: "#002b5e"}, Arena: "American Airlines Center", Capacity: 19200, MarketSize: 8, Prestige: 80, FanPatience: 65},
		{Id: "team-hou", ExternalId: "1610612745", City: "Houston", Name: "Rockets", Abbreviation: "HOU", Conference: "West", Division: "Southwest", Colors: types.TeamColors{Primary: "#ce1141", Secondary: "#000000"}, Arena: "Toyota Center", Capacity: 18055, MarketSize: 7, Prestige: 70, FanPatience: 60},
		{Id: "team-nop", ExternalId: "1610612740", City: "New Orleans", Name: "Pelicans", Abbreviation: "NOP", Conference: "West", Division: "Southwest", Colors: types.TeamColors{Primary: "#0c2340", Secondary: "#c8102e"}, Arena: "Smoothie King Center", Capacity: 16867, MarketSize: 3, Prestige: 65, FanPatience: 60},
		{Id: "team-was", ExternalId: "1610612764", City: "Washington", Name: "Wizards", Abbreviation: "WAS", Conference: "East", Division: "Southeast", Colors: types.TeamColors{Primary: "#00788c", Secondary: "#ef3b24"}, Arena: "Capital One Arena", Capacity: 20356, MarketSize: 7, Prestige: 55, FanPatience: 50},
		{Id: "team-cha", ExternalId: "1610612766", City: "Charlotte", Name: "Hornets", Abbreviation: "CHA", Conference: "East", Division: "Southeast", Colors: types.TeamColors{Primary: "#1d428a", Secondary: "#c8102e"}, Arena: "Spectrum Center", Capacity: 19077, MarketSize: 4, Prestige: 55, FanPatience: 55},
		{Id: "team-orl", ExternalId: "1610612753", City: "Orlando", Name: "Magic", Abbreviation: "ORL", Conference: "East", Division: "Southeast", Colors: types.TeamColors{Primary: "#00788c", Secondary: "#c4ced4"}, Arena: "Kia Center", Capacity: 18846, MarketSize: 5, Prestige: 60, FanPatience: 55},
		{Id: "team-sas", ExternalId: "1610612759", City: "San Antonio", Name: "Spurs", Abbreviation: "SAS", Conference: "West", Division: "Southwest", Colors: types.TeamColors{Primary: "#c4ced4", Secondary: "#000000"}, Arena: "Frost Bank Center", Capacity: 18400, MarketSize: 4, Prestige: 70, FanPatience: 75},
	}

	teams := make([]types.StaticTeam, len(templates))
	for i, t := range templates {
		owner := logic.DeriveOwner(types.StaticTeam{
			Id:       t.Id,
			Prestige: t.Prestige,
		}, i)
		teams[i] = types.StaticTeam{
			Id:           t.Id,
			ExternalId:   t.ExternalId,
			City:         t.City,
			Name:         t.Name,
			Abbreviation: t.Abbreviation,
			Conference:   t.Conference,
			Division:     t.Division,
			Colors:       t.Colors,
			Arena:        t.Arena,
			Capacity:     t.Capacity,
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
		{Pos: types.PositionPG, Height: 74, Weight: 185, Age: 25},
		{Pos: types.PositionSG, Height: 76, Weight: 200, Age: 24},
		{Pos: types.PositionSF, Height: 78, Weight: 215, Age: 26},
		{Pos: types.PositionPF, Height: 80, Weight: 235, Age: 27},
		{Pos: types.PositionC, Height: 82, Weight: 255, Age: 26},
	}

	firstNames := []string{
		"Luka", "Jayson", "Joel", "Giannis", "Nikola", "Shai", "Anthony", "Kawhi",
		"Devin", "Trae", "Donovan", "Tyrese", "Jaylen", "Paolo", "Cade", "Scottie",
		"Alperen", "Chet", "Franz", "Jalen", "Derrick", "Damian", "Jimmy", "Kyrie",
		"Paul", "De'Aaron", "Bam", "Victor", "LaMelo", "Zion",
		"Dejounte", "Brandon", "Mikal", "Jabari", "Keegan", "Desmond",
		"Tyler", "Darius", "Jaren", "Evan", "Walker", "Brook",
		"RJ", "Coby", "Anfernee", "Buddy", "Jordan", "Cameron",
		"Marcus", "Davion", "Tre", "Keyonte", "Cam", "Keldon",
		"Deni", "Patrick", "Herbert", "Kyle", "Bruce", "Aaron",
		"Jeff", "Reggie", "Naz", "Sam", "Donte", "Caleb",
		"Dillon", "Trey", "Obi", "Jerami", "Malik", "Harrison",
		"Luke", "Grant", "Kevon", "Ish", "Cory", "Jose",
		"Naji", "Xavier", "Drew", "Quentin", "Austin", "Dennis",
		"Goran", "Ivica", "Isaiah", "Onyeka", "Shaedon", "Tari",
		"Usman", "MarJon", "Christian", "Peyton", "Ayo", "Alex",
	}
	lastNames := []string{
		"Doncic", "Tatum", "Embiid", "Antetokounmpo", "Jokic", "Gilgeous-Alexander",
		"Edwards", "Leonard", "Booker", "Young", "Mitchell", "Haliburton", "Brown",
		"Banchero", "Cunningham", "Barnes", "Sengun", "Holmgren", "Wagner", "Brunson",
		"White", "Harden", "Lillard", "Butler", "Irving", "George", "Fox", "Adebayo",
		"Wembanyama", "Ball",
		"Murray", "Ingram", "Bridges", "Smith", "Bane",
		"Herro", "Garland", "Jackson", "Mobley", "Kessler", "Lopez",
		"Barrett", "LaVine", "Simons", "Maxey", "Bogdanovic", "Poole",
		"Caruso", "Johnson", "Smart", "Jones", "Thomas",
		"Thompson", "Vassell", "Avdija", "Williams", "Eason",
		"McConnell", "Lowry", "Gordon", "Green",
		"Watson", "Reid", "Hauser", "Divincenzo", "Martin",
		"Nembhard", "Oladipo", "Grimes", "Russell", "Harris",
		"Prince", "Porter", "Looney", "Beal", "Marshall",
		"Washington", "Hart", "Reaves", "Schroder", "Zubac",
		"Stewart", "Okongwu", "Dieng", "Murphy", "Dosunmu",
		"Craig", "Hayes", "Dragic", "Augustin", "Achiuwa",
		"Nnaji", "Clarke", "Brooks", "Powell", "Conley",
	}

	var players []types.StaticPlayer
	nameIdx := 0
	idx := 0
	for _, team := range teams {
		for i := 0; i < 10; i++ {
			profile := profiles[i]

			fn := firstNames[nameIdx/len(lastNames)%len(firstNames)]
			ln := lastNames[nameIdx%len(lastNames)]
			nameIdx++

			isStarter := i < 5
			rating := clampFloat(95-float64(idx)*0.4-float64(i)*0.8+float64(randInt(r, -2, 2)), 60, 99)
			if !isStarter {
				rating = clampFloat(rating-float64(randInt(r, 8, 15)), 55, 85)
			}
			ri := int(rating)
			isStar := idx < 4 && isStarter

			age := clampInt(profile.Age+randInt(r, -3, 3), 20, 38)
			teamId := team.Id
			playerId := fmt.Sprintf("p-%s-%d", strings.ToLower(team.Abbreviation), i+1)

			secPos := []types.Position{}
			if i == 0 {
				secPos = []types.Position{types.PositionSG}
			} else if i == 4 {
				secPos = []types.Position{types.PositionPF}
			} else if i == 5 {
				secPos = []types.Position{types.PositionSG}
			} else if i == 9 {
				secPos = []types.Position{types.PositionPF}
			}

			realName := fn + " " + ln
			externalId := playerNameToId[realName]
			if externalId == "" {
				externalId = fmt.Sprintf("%d", 10000+idx*10+i)
			}

			player := types.StaticPlayer{
				Id:                playerId,
				ExternalId:        externalId,
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
				College:           randomCollege(r),
				Country:           randomCountry(r),
				DraftYear:         2020 + randInt(r, -5, 0),
				DraftRound:        randInt(r, 1, 2),
				DraftPick:         randInt(r, 1, 30),
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

var colleges = []string{
	"Duke", "Kentucky", "Kansas", "North Carolina", "UCLA",
	"Gonzaga", "Villanova", "Michigan", "Arizona", "Indiana",
	"Louisville", "Syracuse", "Ohio State", "Florida", "Texas",
	"Memphis", "Houston", "Baylor", "Purdue", "Connecticut",
	"Marquette", "Arkansas", "Auburn", "Alabama", "LSU",
	"Oregon", "USC", "Colorado", "Arizona State", "Washington",
}

var countries = []string{
	"USA", "USA", "USA", "USA", "USA",
	"Canada", "France", "Australia", "Nigeria", "Serbia",
	"Croatia", "Lithuania", "Latvia", "Spain", "Argentina",
	"Brazil", "Cameroon", "Senegal", "Mali", "Turkey",
	"Greece", "Italy", "Germany", "Slovenia", "Montenegro",
}

func randomCollege(r *rand.Rand) string {
	return colleges[r.Intn(len(colleges))]
}

func randomCountry(r *rand.Rand) string {
	return countries[r.Intn(len(countries))]
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

	awardsPath := filepath.Join(base, "awards-history.json")
	if _, err := os.Stat(awardsPath); os.IsNotExist(err) {
		awards := []types.AwardWinner{}
		if err := writeJSON(awardsPath, map[string]interface{}{
			"version":   "0.2.0",
			"updatedAt": "2026-01-01T00:00:00Z",
			"awards":    awards,
		}); err != nil {
			return err
		}
	}

	championsPath := filepath.Join(base, "champions.json")
	if _, err := os.Stat(championsPath); os.IsNotExist(err) {
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
		if err := writeJSON(championsPath, map[string]interface{}{
			"version":   "0.2.0",
			"updatedAt": "2026-01-01T00:00:00Z",
			"champions": champions,
		}); err != nil {
			return err
		}
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
			TeamCount:   30,
			PlayerCount: 300,
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
