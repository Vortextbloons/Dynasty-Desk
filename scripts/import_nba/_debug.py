import json
s = json.load(open("public/data/nba/2024-25/season-stats.json"))
top = sorted(s, key=lambda x: x.get("points", 0), reverse=True)[:5]
for p in top:
    gp = p["gamesPlayed"]
    pts = p["points"] / gp
    reb = p["rebounds"] / gp
    ast = p["assists"] / gp
    per = p["per"]
    bpm = p["boxPlusMinus"]
    usg = p["usageRate"]
    ts = p["tsPct"]
    print(f"ID:{p['playerExternalId']} {pts:.1f}ppg {reb:.1f}rpg {ast:.1f}apg PER:{per:.1f} BPM:{bpm:.1f} USG:{usg:.1f} TS:{ts:.3f}")

r = json.load(open("public/data/nba/2024-25/roster.json"))
by_ext = {p["externalId"]: p for p in r}
for p in top:
    rp = by_ext.get(p["playerExternalId"], {})
    rat = rp.get("ratings", {})
    print(f"  -> {rp.get('firstName','?')} {rp.get('lastName','?')} OVR:{rat.get('overall','?')} 3PT:{rat.get('threePoint','?')} INS:{rat.get('insideScoring','?')} SPD:{rat.get('speed','?')}")
