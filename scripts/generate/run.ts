import {
  generateAllSeasons,
  generateManifest,
  generateShared,
} from './generateSyntheticSnapshot.js'

await generateAllSeasons()
await generateShared()
await generateManifest()
console.log('done')
