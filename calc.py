import json
import re

app = open('app.js','r',encoding='utf-8').read()
m = re.search(r'const globalPlots = (\[.*?\]);', app, re.DOTALL)
plots = json.loads(m.group(1))
rates = {
    'Normal plot': 10000, 
    '80ft Main road plot': 15000, 
    '60ft corner plot': 11500, 
    '30ft corner plot': 11000, 
    'Commercial plot': 17000,
    'OFC': 0
}
from collections import defaultdict
gaj_by_type = defaultdict(float)
count_by_type = defaultdict(int)
total_gaj = 0

for p in plots:
    t = p['type']
    val = float(p['gaj'])
    gaj_by_type[t] += val
    count_by_type[t] += 1
    total_gaj += val

print("Total Gaj Division Per Plot Type:")
for t in sorted(gaj_by_type.keys()):
    print(f"{t}: {gaj_by_type[t]:,.2f} Sq. Yds. ({count_by_type[t]} plots)")
print("-" * 40)
print(f"Total Area: {total_gaj:,.2f} Sq. Yds.")
