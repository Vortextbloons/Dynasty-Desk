import { readFileSync } from 'fs';
const data = JSON.parse(readFileSync('./public/data/nba/2024-25/roster.json', 'utf-8'));

// Position breakdown with details
console.log('=== Position Breakdown ===');
const posCounts = {};
for (const p of data) {
  posCounts[p.position] = (posCounts[p.position] || 0) + 1;
}
for (const [pos, count] of Object.entries(posCounts)) {
  console.log(`  ${pos}: ${count} players`);
}

// Check secondary positions
console.log('\n=== Secondary Positions ===');
const secPosCounts = {};
for (const p of data) {
  if (p.secondaryPositions && p.secondaryPositions.length > 0) {
    const key = p.position + ' + ' + p.secondaryPositions.join(',');
    secPosCounts[key] = (secPosCounts[key] || 0) + 1;
  }
}
for (const [key, count] of Object.entries(secPosCounts)) {
  console.log(`  ${key}: ${count}`);
}

// Sample PG players if any
const pgs = data.filter(p => p.position === 'PG');
console.log(`\n=== PG Players (${pgs.length}) ===`);
pgs.slice(0,10).forEach(p => console.log(`  ${p.firstName} ${p.lastName} OVR:${p.ratings.overall}`));

// Sample PF players if any  
const pfs = data.filter(p => p.position === 'PF');
console.log(`\n=== PF Players (${pfs.length}) ===`);
pfs.slice(0,10).forEach(p => console.log(`  ${p.firstName} ${p.lastName} OVR:${p.ratings.overall}`));

// Check if names match Go generator's name lists
const firstNamesGo = ["Luka","Jayson","Joel","Giannis","Nikola","Shai","Anthony","Kawhi","Devin","Trae","Donovan","Tyrese","Jaylen","Paolo","Cade","Scottie","Alperen","Chet","Franz","Jalen","Derrick","Damian","Jimmy","Kyrie","Paul","De'Aaron","Bam","Victor","LaMelo","Zion","Dejounte","Brandon","Mikal","Jabari","Keegan","Desmond","Tyler","Darius","Jaren","Evan","Walker","Brook","RJ","Coby","Anfernee","Buddy","Jordan","Cameron","Marcus","Davion","Tre","Keyonte","Cam","Keldon","Deni","Patrick","Herbert","Kyle","Bruce","Aaron","Jeff","Reggie","Naz","Sam","Donte","Caleb","Dillon","Trey","Obi","Jerami","Malik","Harrison","Luke","Grant","Kevon","Ish","Cory","Jose","Naji","Xavier","Drew","Quentin","Austin","Dennis","Goran","Ivica","Isaiah","Onyeka","Shaedon","Tari","Usman","MarJon","Christian","Peyton","Ayo","Alex"];
const lastNamesGo = ["Doncic","Tatum","Embiid","Antetokounmpo","Jokic","Gilgeous-Alexander","Edwards","Leonard","Booker","Young","Mitchell","Haliburton","Brown","Banchero","Cunningham","Barnes","Sengun","Holmgren","Wagner","Brunson","White","Harden","Lillard","Butler","Irving","George","Fox","Adebayo","Wembanyama","Ball","Murray","Ingram","Bridges","Smith","Bane","Herro","Garland","Jackson","Mobley","Kessler","Lopez","Barrett","LaVine","Simons","Maxey","Bogdanovic","Poole","Caruso","Johnson","Smart","Jones","Thomas","Thompson","Vassell","Avdija","Williams","Eason","McConnell","Lowry","Gordon","Green","Watson","Reid","Hauser","Divincenzo","Martin","Nembhard","Oladipo","Grimes","Russell","Harris","Prince","Porter","Looney","Beal","Marshall","Washington","Hart","Reaves","Schroder","Zubac","Stewart","Okongwu","Dieng","Murphy","Dosunmu","Craig","Hayes","Dragic","Augustin","Achiuwa","Nnaji","Clarke","Brooks","Powell","Conley"];

const firstNamesData = [...new Set(data.map(p => p.firstName))];
const lastNamesData = [...new Set(data.map(p => p.lastName))];

const matchingFirst = firstNamesData.filter(n => firstNamesGo.includes(n));
const matchingLast = lastNamesData.filter(n => lastNamesGo.includes(n));

console.log(`\n=== Name Match with Go Generator ===`);
console.log(`First names in data: ${firstNamesData.length}, matching Go: ${matchingFirst.length}`);
console.log(`Last names in data: ${lastNamesData.length}, matching Go: ${matchingLast.length}`);

// Show non-matching first names
const nonMatchingFirst = firstNamesData.filter(n => !firstNamesGo.includes(n));
console.log(`\nNon-matching first names (${nonMatchingFirst.length}): ${nonMatchingFirst.slice(0,20).join(', ')}`);

// Check all 29 seasons
console.log('\n=== Season Coverage ===');
import { readdirSync, existsSync } from 'fs';
const nbaDir = './public/data/nba';
const seasons = readdirSync(nbaDir).filter(s => existsSync(`${nbaDir}/${s}/roster.json`));
console.log(`Seasons with roster data: ${seasons.length}`);
seasons.forEach(s => {
  const roster = JSON.parse(readFileSync(`${nbaDir}/${s}/roster.json`, 'utf-8'));
  const pos = {};
  roster.forEach(p => pos[p.position] = (pos[p.position]||0)+1);
  console.log(`  ${s}: ${roster.length} players - ${Object.entries(pos).map(([k,v])=>`${k}:${v}`).join(' ')}`);
});
