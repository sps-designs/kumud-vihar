import pymupdf

doc = pymupdf.open('assests/kumud_vihar_gulabpura.pdf')
page = doc[0]
words = page.get_text('words')

# Find all words near each commercial zone
# COM-1: around x=511, y=945 (native PDF coords)
# COM-2: around x=386, y=945 (native PDF coords)

print("=== Near COM-1 (x~511, y~945) ===")
nearby1 = [(w[4], round(w[0],1), round(w[1],1)) for w in words 
           if 460 < w[0] < 580 and 880 < w[1] < 1010]
for w in sorted(nearby1, key=lambda x: x[2]):
    print(f"  {w[0]!r:20} at ({w[1]}, {w[2]})")

print("\n=== Near COM-2 (x~386, y~945) ===")
nearby2 = [(w[4], round(w[0],1), round(w[1],1)) for w in words 
           if 340 < w[0] < 465 and 880 < w[1] < 1010]
for w in sorted(nearby2, key=lambda x: x[2]):
    print(f"  {w[0]!r:20} at ({w[1]}, {w[2]})")

# Also find A-1..A-10 and B-1..B-7 coords
print("\n=== A-1 to A-10 coords ===")
import re
a_plots = [(w[4], round(w[0],1), round(w[1],1)) for w in words 
           if re.match(r'^A-$', w[4].strip())]
nums = [(w[4], round(w[0],1), round(w[1],1)) for w in words if w[4].strip().isdigit()]
# Pair them
for ap in sorted(a_plots, key=lambda x: x[1]):
    # Find closest number
    closest = min(nums, key=lambda n: abs(n[1]-ap[1])+abs(n[2]-ap[2]))
    if abs(closest[1]-ap[1]) < 15 and abs(closest[2]-ap[2]) < 15:
        name = f"A-{closest[0]}"
        if closest[0] in [str(i) for i in range(1,11)]:
            print(f"  {name}: x={ap[1]}, y={ap[2]}")
