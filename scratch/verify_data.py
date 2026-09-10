import json, re
f = open('app.js', encoding='utf-8').read()
m = re.search(r'const globalPlots = (\[.*?\]);', f, re.DOTALL)
data = json.loads(m.group(1))
print('First 20 plots:')
for p in data[:20]:
    t = p['type']
    print(f"  {p['plotNo']} ({t})")
print()
print('Last 10 plots:')
for p in data[-10:]:
    t = p['type']
    print(f"  {p['plotNo']} ({t})")
