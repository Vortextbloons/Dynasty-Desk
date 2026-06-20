export interface PlayerTraits {
  workEthic: number
  loyalty: number
  ego: number
  greed: number
  leadership: number
  coachability: number
  injuryRisk: number
  shotCreation: number
  defensiveVersatility: number
}

export function emptyTraits(): PlayerTraits {
  return {
    workEthic: 50,
    loyalty: 50,
    ego: 50,
    greed: 50,
    leadership: 50,
    coachability: 50,
    injuryRisk: 50,
    shotCreation: 50,
    defensiveVersatility: 50,
  }
}
