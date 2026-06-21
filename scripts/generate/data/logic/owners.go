package logic

import (
	"dynasty-desk-gen/data"
	"dynasty-desk-gen/types"
	"math"
)

type seededRandom struct {
	h int32
}

func newSeededRandom(seed string) *seededRandom {
	var h int32 = 0
	for i := 0; i < len(seed); i++ {
		h = int32(uint32(h)*31 + uint32(seed[i]))
	}
	return &seededRandom{h: h}
}

func (r *seededRandom) next() float64 {
	r.h = int32(uint32(r.h) ^ (uint32(r.h) >> 16))
	r.h = int32(uint32(r.h) * 0x45d9f3b)
	r.h = int32(uint32(r.h) ^ (uint32(r.h) >> 13))
	r.h = int32(uint32(r.h) * 0x45d9f3b)
	r.h = int32(uint32(r.h) ^ (uint32(r.h) >> 16))
	return float64(uint32(r.h)) / 4294967296.0
}

func DeriveOwner(team types.StaticTeam, index int) types.OwnerProfile {
	rand := newSeededRandom(team.Id)

	name := data.OwnerNames[index%len(data.OwnerNames)]

	var personality types.OwnerPersonality
	if team.Prestige >= 85 {
		if rand.next() > 0.5 {
			personality = types.OwnerWinNow
		} else {
			personality = types.OwnerSpendthrift
		}
	} else if team.Prestige <= 60 {
		if rand.next() > 0.5 {
			personality = types.OwnerPatient
		} else {
			personality = types.OwnerFrugal
		}
	} else {
		idx := int(math.Floor(rand.next() * float64(len(data.OwnerPersonalities))))
		personality = types.OwnerPersonality(data.OwnerPersonalities[idx])
	}

	netWorth := math.Round(15_000_000_000 + rand.next()*10_000_000_000)
	cash := math.Round(40_000_000 + rand.next()*30_000_000)

	return types.OwnerProfile{
		TeamId:                  team.Id,
		Name:                    name,
		Personality:             personality,
		NetWorth:                netWorth,
		Cash:                    cash,
		SoftCashPressureSeasons: 0,
	}
}
