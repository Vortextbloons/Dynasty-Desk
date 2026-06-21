import { runCalibrationSuite } from '../src/game/management/calibration'
import { loadStaticSnapshot } from '../src/data/loadStaticData'

async function main() {
  const snapshot = await loadStaticSnapshot('nba-2025-26')
  if (!snapshot) {
    console.error('Could not load static snapshot')
    process.exit(1)
  }
  const report = await runCalibrationSuite(snapshot)
  console.log(JSON.stringify(report, null, 2))
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
