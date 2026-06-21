import { readFileSync } from 'fs';
const data = JSON.parse(readFileSync('./public/data/nba/2024-25/roster.json', 'utf-8'));

console.log(`Total players: ${data.length}\n`);

// Check a sample of players
console.log('=== First 30 Players ===');
data.slice(0,30).forEach(p => {
  const r = p.ratings;
  console.log(`${p.firstName} ${p.lastName} (${p.position}) OVR:${r.overall} INS:${r.insideScoring} MID:${r.midrange} 3PT:${r.threePoint} PER-D:${r.perimeterDefense} INT-D:${r.interiorDefense} SPD:${r.speed} STR:${r.strength}`);
});

// Check weight sums
console.log('\n=== Weight Sums ===');
const OVERALL_WEIGHTS = {
  PG: {ballHandling:0.15,passing:0.15,perimeterDefense:0.12,threePoint:0.12,speed:0.10,offensiveIq:0.10,midrange:0.06,freeThrow:0.05,consistency:0.05,defensiveIq:0.05,steal:0.05},
  SG: {threePoint:0.15,perimeterDefense:0.12,midrange:0.10,ballHandling:0.10,speed:0.08,offensiveIq:0.08,steal:0.07,freeThrow:0.06,consistency:0.05,defensiveIq:0.05,insideScoring:0.05,closeShot:0.05,offensiveRebound:0.04},
  SF: {threePoint:0.12,midrange:0.10,perimeterDefense:0.12,defensiveIq:0.08,offensiveIq:0.08,speed:0.07,ballHandling:0.06,insideScoring:0.06,offensiveRebound:0.05,defensiveRebound:0.05,freeThrow:0.05,consistency:0.05,strength:0.05,steal:0.06},
  PF: {insideScoring:0.15,defensiveRebound:0.12,offensiveRebound:0.08,interiorDefense:0.10,midrange:0.08,threePoint:0.07,strength:0.08,offensiveIq:0.06,defensiveIq:0.06,freeThrow:0.04,consistency:0.05,closeShot:0.06,vertical:0.05},
  C: {insideScoring:0.18,defensiveRebound:0.15,interiorDefense:0.12,offensiveRebound:0.08,strength:0.10,closeShot:0.07,offensiveIq:0.06,defensiveIq:0.05,freeThrow:0.04,consistency:0.05,vertical:0.05,block:0.05},
};
for (const [pos, w] of Object.entries(OVERALL_WEIGHTS)) {
  const sum = Object.values(w).reduce((a,b)=>a+b,0);
  console.log(`${pos}: ${sum.toFixed(3)} (should be 1.000)`);
}

// Check rating distributions by position
console.log('\n=== Rating Distributions by Position ===');
const positions = ['PG','SG','SF','PF','C'];
for (const pos of positions) {
  const posPlayers = data.filter(p => p.position === pos);
  const overalls = posPlayers.map(p => p.ratings.overall).sort((a,b)=>a-b);
  const avg = overalls.reduce((a,b)=>a+b,0)/overalls.length;
  const median = overalls[Math.floor(overalls.length/2)];
  console.log(`${pos} (${posPlayers.length} players): avg=${avg.toFixed(1)} median=${median} min=${overalls[0]} max=${overalls[overalls.length-1]}`);
}

// Check star distribution
console.log('\n=== Top 20 Players by Overall ===');
const sorted = [...data].sort((a,b) => b.ratings.overall - a.ratings.overall);
sorted.slice(0,20).forEach((p,i) => {
  const r = p.ratings;
  console.log(`${i+1}. ${p.firstName} ${p.lastName} (${p.position}) OVR:${r.overall} POT:${r.potential}`);
});

// Count ratings below 50 (replacement)
console.log('\n=== Ratings Below Replacement (50) ===');
let belowCount = 0;
const belowExamples = [];
for (const p of data) {
  for (const [k,v] of Object.entries(p.ratings)) {
    if (k !== 'overall' && typeof v === 'number' && v < 50) {
      belowCount++;
      if (belowExamples.length < 10) belowExamples.push(`${p.firstName} ${p.lastName}.${k}=${v}`);
    }
  }
}
console.log(`Total individual ratings below 50: ${belowCount}`);
belowExamples.forEach(e => console.log(`  ${e}`));

// Check for extreme ratings
console.log('\n=== Extreme ratings (below 40 or above 95) ===');
let extremeCount = 0;
for (const p of data) {
  for (const [k,v] of Object.entries(p.ratings)) {
    if (k !== 'overall' && typeof v === 'number') {
      if (v < 40) { extremeCount++; console.log(`  LOW: ${p.firstName} ${p.lastName}.${k}=${v}`); }
      if (v > 95) { extremeCount++; console.log(`  HIGH: ${p.firstName} ${p.lastName}.${k}=${v}`); }
    }
  }
}
if (extremeCount === 0) console.log('  None found');

// Check for flat/identical ratings across players
console.log('\n=== Rating Variance Check ===');
const ratingKeys = ['insideScoring','closeShot','midrange','threePoint','freeThrow','ballHandling','passing','offensiveIq','offensiveRebound','defensiveRebound','perimeterDefense','interiorDefense','steal','block','defensiveIq','speed','strength','vertical','stamina','durability','clutch','consistency','potential'];
for (const key of ratingKeys) {
  const values = data.map(p => p.ratings[key]).filter(v => typeof v === 'number');
  const unique = new Set(values);
  const avg = values.reduce((a,b)=>a+b,0)/values.length;
  const variance = values.reduce((s,v)=>s+(v-avg)**2,0)/values.length;
  if (unique.size < 10) console.log(`  WARNING: ${key} has only ${unique.size} unique values (avg=${avg.toFixed(1)}, variance=${variance.toFixed(1)})`);
}

// Check that starters (top 5 per team) are actually good
console.log('\n=== Starter Quality Check (top 5 per team) ===');
const teamIds = [...new Set(data.map(p => p.teamId))];
for (const tid of teamIds.slice(0,5)) {
  const teamPlayers = data.filter(p => p.teamId === tid).sort((a,b) => b.ratings.overall - a.ratings.overall);
  const starters = teamPlayers.slice(0,5);
  const bench = teamPlayers.slice(5);
  const starterAvg = starters.reduce((s,p)=>s+p.ratings.overall,0)/starters.length;
  const benchAvg = bench.length > 0 ? bench.reduce((s,p)=>s+p.ratings.overall,0)/bench.length : 0;
  console.log(`${tid}: starters avg=${starterAvg.toFixed(1)} bench avg=${benchAvg.toFixed(1)} gap=${(starterAvg-benchAvg).toFixed(1)}`);
}

// Check for position-less players (all ratings same)
console.log('\n=== Players with suspiciously uniform ratings ===');
let uniformCount = 0;
for (const p of data) {
  const values = ratingKeys.map(k => p.ratings[k]).filter(v => typeof v === 'number');
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (max - min < 8) {
    uniformCount++;
    if (uniformCount <= 5) console.log(`  ${p.firstName} ${p.lastName} (${p.position}): range=${min}-${max} (spread=${max-min})`);
  }
}
console.log(`Total players with uniform ratings (spread < 8): ${uniformCount}`);
