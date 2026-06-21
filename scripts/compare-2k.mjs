import { readFileSync } from 'fs';
import { join } from 'path';

const roster = JSON.parse(readFileSync(join(import.meta.dirname, '..', 'public', 'data', 'nba', '2024-25', 'roster.json'), 'utf-8'));
const k2ratings = JSON.parse(readFileSync(join(import.meta.dirname, '2k-ratings.json'), 'utf-8'));

function normalize(str) {
  return str
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\bjr\.?\b/g, '')
    .replace(/\bii+\b/g, '')
    .replace(/\bsr\.?\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function makeKey(first, last) {
  return normalize(`${first} ${last}`);
}

const k2map = new Map();
for (const p of k2ratings) {
  const key = makeKey(p.firstName, p.lastName);
  if (!k2map.has(key)) {
    k2map.set(key, p);
  } else {
    const existing = k2map.get(key);
    if (p.rating > existing.rating) {
      k2map.set(key, p);
    }
  }
}

const matches = [];
const unmatched = [];

for (const player of roster) {
  const key = makeKey(player.firstName, player.lastName);
  const k2p = k2map.get(key);
  if (k2p) {
    matches.push({
      firstName: player.firstName,
      lastName: player.lastName,
      position: player.position,
      dynastyOvr: player.ratings.overall,
      k2Ovr: k2p.rating,
      delta: player.ratings.overall - k2p.rating,
      team: k2p.team,
    });
  } else {
    unmatched.push(`${player.firstName} ${player.lastName} (${player.position})`);
  }
}

matches.sort((a, b) => b.k2Ovr - a.k2Ovr);

const deltas = matches.map(m => m.delta);
const absDeltas = deltas.map(d => Math.abs(d));
const mean = deltas.reduce((a, b) => a + b, 0) / deltas.length;
const median = [...deltas].sort((a, b) => a - b)[Math.floor(deltas.length / 2)];
const stdDev = Math.sqrt(deltas.reduce((s, d) => s + (d - mean) ** 2, 0) / deltas.length);
const mae = absDeltas.reduce((a, b) => a + b, 0) / absDeltas.length;

const maxOver = [...matches].sort((a, b) => b.delta - a.delta).slice(0, 15);
const maxUnder = [...matches].sort((a, b) => a.delta - b.delta).slice(0, 15);

const tiers = [
  { label: '90+ (Elite)', min: 90, max: 999 },
  { label: '85-89 (All-Star)', min: 85, max: 89 },
  { label: '80-84 (Starter)', min: 80, max: 84 },
  { label: '75-79 (Rotational)', min: 75, max: 79 },
  { label: '70-74 (Bench)', min: 70, max: 74 },
  { label: '<70 (Deep Bench)', min: 0, max: 69 },
];

const posGroups = {};
for (const m of matches) {
  if (!posGroups[m.position]) posGroups[m.position] = [];
  posGroups[m.position].push(m);
}

const buckets = { '±2': 0, '±3-5': 0, '±6-10': 0, '>10': 0 };
for (const d of deltas) {
  const ad = Math.abs(d);
  if (ad <= 2) buckets['±2']++;
  else if (ad <= 5) buckets['±3-5']++;
  else if (ad <= 10) buckets['±6-10']++;
  else buckets['>10']++;
}

console.log('='.repeat(80));
console.log('  DYNASTY DESK vs NBA 2K25 — RATING COMPARISON');
console.log('='.repeat(80));
console.log(`\n  Matched: ${matches.length} of ${roster.length} Dynasty Desk players (${(matches.length / roster.length * 100).toFixed(1)}%)`);
console.log(`  2K reference players: ${k2ratings.length}`);

console.log('\n' + '-'.repeat(80));
console.log('  AGGREGATE STATISTICS');
console.log('-'.repeat(80));
console.log(`  Mean Delta (Dynasty - 2K):  ${mean >= 0 ? '+' : ''}${mean.toFixed(2)}`);
console.log(`  Median Delta:               ${median >= 0 ? '+' : ''}${median}`);
console.log(`  Std Deviation:              ${stdDev.toFixed(2)}`);
console.log(`  Mean Absolute Error:        ${mae.toFixed(2)}`);
console.log(`  Min Delta:                  ${Math.min(...deltas)}`);
console.log(`  Max Delta:                  ${Math.max(...deltas)}`);

console.log('\n' + '-'.repeat(80));
console.log('  DISTRIBUTION');
console.log('-'.repeat(80));
for (const [bucket, count] of Object.entries(buckets)) {
  const pct = (count / matches.length * 100).toFixed(1);
  const bar = '█'.repeat(Math.round(count / matches.length * 50));
  console.log(`  ${bucket.padEnd(6)} ${String(count).padStart(4)} (${pct.padStart(5)}%)  ${bar}`);
}

console.log('\n' + '-'.repeat(80));
console.log('  TIER ANALYSIS (Avg Dynasty OVR vs Avg 2K OVR)');
console.log('-'.repeat(80));
for (const tier of tiers) {
  const tierMatches = matches.filter(m => m.k2Ovr >= tier.min && m.k2Ovr <= tier.max);
  if (tierMatches.length === 0) continue;
  const avgDynasty = tierMatches.reduce((s, m) => s + m.dynastyOvr, 0) / tierMatches.length;
  const avg2k = tierMatches.reduce((s, m) => s + m.k2Ovr, 0) / tierMatches.length;
  const avgDelta = tierMatches.reduce((s, m) => s + m.delta, 0) / tierMatches.length;
  console.log(`  ${tier.label.padEnd(24)} n=${String(tierMatches.length).padStart(3)}  Dynasty: ${avgDynasty.toFixed(1).padStart(5)}  2K: ${avg2k.toFixed(1).padStart(5)}  Delta: ${avgDelta >= 0 ? '+' : ''}${avgDelta.toFixed(1)}`);
}

console.log('\n' + '-'.repeat(80));
console.log('  POSITION ANALYSIS');
console.log('-'.repeat(80));
for (const [pos, players] of Object.entries(posGroups).sort()) {
  const avgDelta = players.reduce((s, m) => s + m.delta, 0) / players.length;
  const avgDynasty = players.reduce((s, m) => s + m.dynastyOvr, 0) / players.length;
  const avg2k = players.reduce((s, m) => s + m.k2Ovr, 0) / players.length;
  console.log(`  ${pos.padEnd(4)} n=${String(players.length).padStart(3)}  Dynasty: ${avgDynasty.toFixed(1).padStart(5)}  2K: ${avg2k.toFixed(1).padStart(5)}  Delta: ${avgDelta >= 0 ? '+' : ''}${avgDelta.toFixed(1)}`);
}

console.log('\n' + '-'.repeat(80));
console.log('  TOP 15 OVER-RATED vs 2K (Dynasty Desk > 2K)');
console.log('-'.repeat(80));
console.log('  ' + 'Player'.padEnd(30) + 'Pos  Dyn  2K   Delta');
for (const m of maxOver) {
  const name = `${m.firstName} ${m.lastName}`;
  console.log(`  ${name.padEnd(30)} ${m.position.padEnd(4)} ${String(m.dynastyOvr).padStart(3)} ${String(m.k2Ovr).padStart(3)}   ${m.delta >= 0 ? '+' : ''}${m.delta}`);
}

console.log('\n' + '-'.repeat(80));
console.log('  TOP 15 UNDER-RATED vs 2K (Dynasty Desk < 2K)');
console.log('-'.repeat(80));
console.log('  ' + 'Player'.padEnd(30) + 'Pos  Dyn  2K   Delta');
for (const m of maxUnder) {
  const name = `${m.firstName} ${m.lastName}`;
  console.log(`  ${name.padEnd(30)} ${m.position.padEnd(4)} ${String(m.dynastyOvr).padStart(3)} ${String(m.k2Ovr).padStart(3)}   ${m.delta >= 0 ? '+' : ''}${m.delta}`);
}

console.log('\n' + '-'.repeat(80));
console.log('  FULL COMPARISON TABLE (sorted by 2K rating)');
console.log('-'.repeat(80));
console.log('  ' + '#'.padStart(3) + ' ' + 'Player'.padEnd(30) + 'Pos  Team  Dyn  2K   Delta');
console.log('  ' + '-'.repeat(72));
matches.forEach((m, i) => {
  const name = `${m.firstName} ${m.lastName}`;
  const sign = m.delta >= 0 ? '+' : '';
  console.log(`  ${String(i + 1).padStart(3)} ${name.padEnd(30)} ${m.position.padEnd(4)} ${m.team.padEnd(4)} ${String(m.dynastyOvr).padStart(3)} ${String(m.k2Ovr).padStart(3)}   ${sign}${m.delta}`);
});

console.log('\n' + '-'.repeat(80));
console.log('  UNMATCHED PLAYERS (in Dynasty Desk but not in 2K reference)');
console.log('-'.repeat(80));
console.log(`  ${unmatched.length} players not matched. Showing first 30:`);
for (const name of unmatched.slice(0, 30)) {
  console.log(`    ${name}`);
}
if (unmatched.length > 30) {
  console.log(`    ... and ${unmatched.length - 30} more`);
}

console.log('\n' + '='.repeat(80));
console.log('  KEY TAKEAWAYS');
console.log('='.repeat(80));

const overRatedCount = deltas.filter(d => d > 0).length;
const underRatedCount = deltas.filter(d => d < 0).length;
const withinFive = buckets['±2'] + buckets['±3-5'];

console.log(`  • Dynasty Desk rates ${overRatedCount > underRatedCount ? 'HIGHER' : 'LOWER'} than 2K on average`);
console.log(`  • ${withinFive} of ${matches.length} (${(withinFive / matches.length * 100).toFixed(0)}%) players are within ±5 points`);
console.log(`  • Biggest over-rate: ${maxOver[0].firstName} ${maxOver[0].lastName} (+${maxOver[0].delta})`);
console.log(`  • Biggest under-rate: ${maxUnder[0].firstName} ${maxUnder[0].lastName} (${maxUnder[0].delta})`);

const eliteMatches = matches.filter(m => m.k2Ovr >= 90);
if (eliteMatches.length > 0) {
  const eliteAvgDelta = eliteMatches.reduce((s, m) => s + m.delta, 0) / eliteMatches.length;
  console.log(`  • Elite players (90+): Dynasty Desk avg delta ${eliteAvgDelta >= 0 ? '+' : ''}${eliteAvgDelta.toFixed(1)}`);
}
