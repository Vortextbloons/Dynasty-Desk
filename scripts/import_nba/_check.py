import json

d = json.load(open("public/data/nba/2024-25/roster.json"))
t = json.load(open("public/data/nba/2024-25/teams.json"))
print(f"{len(d)} players, {len(t)} teams")

p = d[0]
print(f"Player: {p['firstName']} {p['lastName']}")
print(f"  Age: {p['age']} type={type(p['age']).__name__}")
print(f"  Height: {p['heightInches']}in  Weight: {p['weightLbs']}lbs")
print(f"  Pos: {p['position']}  Team: {p['teamId']}")
print(f"  extId: {p['externalId']}  college: {p.get('college','')}")
print(f"  Overall: {p['ratings']['overall']}")

for p2 in d[1:5]:
    print(f"  {p2['firstName']} {p2['lastName']} OVR:{p2['ratings']['overall']} W:{p2['weightLbs']} Age:{p2['age']}")

tm = t[0]
print(f"Team: {tm['name']} extId:{tm['externalId']} arena:{tm.get('arena','')} colors:{tm.get('colors',{})}")

# Check for empty names
empty = [x for x in d if not x.get("firstName") or not x.get("lastName")]
print(f"\nPlayers with empty names: {len(empty)}")
zero_wt = [x for x in d if x.get("weightLbs", 0) == 0]
print(f"Players with zero weight: {len(zero_wt)}")

# Rating distribution
ov = [x["ratings"]["overall"] for x in d]
print(f"\nRating range: {min(ov)}-{max(ov)} avg:{sum(ov)/len(ov):.1f}")
print(f"85+: {sum(1 for x in ov if x>=85)}  70-84: {sum(1 for x in ov if 70<=x<85)}  <70: {sum(1 for x in ov if x<70)}")

top = sorted(d, key=lambda x: x["ratings"]["overall"], reverse=True)[:5]
for p in top:
    print(f"  TOP: {p['firstName']} {p['lastName']} OVR:{p['ratings']['overall']}")
