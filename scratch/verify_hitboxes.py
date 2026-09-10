import json, re
from PIL import Image, ImageDraw, ImageFont
import math

f = open('app.js', encoding='utf-8').read()
m = re.search(r'const globalPlots = (\[.*?\]);', f, re.DOTALL)
data = json.loads(m.group(1))

mult = 3.5

# ===== 1. Diagnose COM overlap =====
print("=== COM HITBOX ANALYSIS ===")
for p in data:
    if 'COM' in p['plotNo']:
        cx, cy, w, h = p['cx'], p['cy'], p['w'], p['h']
        hw = w * mult / 2
        hh = h * mult / 2
        x0, y0 = cx - hw, cy - hh
        x1, y1 = cx + hw, cy + hh
        print(f"{p['plotNo']}: center=({cx:.0f},{cy:.0f}), w={w:.0f}, h={h:.0f}")
        print(f"  Hitbox ({mult}x): ({x0:.0f},{y0:.0f}) -> ({x1:.0f},{y1:.0f})")
        print(f"  Hitbox size: {x1-x0:.0f}px wide, {y1-y0:.0f}px tall")
        print()

# ===== 2. Check if COM-1 hitbox overlaps COM-2 center =====
coms = {p['plotNo']: p for p in data if 'COM' in p['plotNo']}
if 'COM-1' in coms and 'COM-2' in coms:
    c1 = coms['COM-1']
    c2 = coms['COM-2']
    c1_x0 = c1['cx'] - c1['w'] * mult / 2
    c1_x1 = c1['cx'] + c1['w'] * mult / 2
    print(f"COM-1 X range: {c1_x0:.0f} to {c1_x1:.0f}")
    print(f"COM-2 center X: {c2['cx']:.0f}")
    print(f"COM-2 center inside COM-1 hitbox? {c1_x0 <= c2['cx'] <= c1_x1}")

# ===== 3. Sample regular plot hitbox analysis =====
print("\n=== SAMPLE REGULAR PLOT HITBOX ANALYSIS ===")
# A-1 should be 30' wide = 2.5px per foot at 3x zoom * 30' = 75px wide
# Text label w ~26px * 3.5 = 91px - slightly wider than plot
a1 = next((p for p in data if p['plotNo'] == 'A-1'), None)
if a1:
    w_hitbox = a1['w'] * mult
    h_hitbox = a1['h'] * mult
    print(f"A-1: label_w={a1['w']:.1f}px, hitbox_w={w_hitbox:.1f}px")
    print(f"  Expected plot width for 30' plot: ~75px")
    print(f"  Expected plot height for 65' plot: ~162px")
    print(f"  Hitbox height: {h_hitbox:.1f}px (should be ~162px)")

# ===== 4. Render visual verification =====
print("\n=== GENERATING VISUAL VERIFICATION ===")
img = Image.open('Full_Map.jpg').convert('RGB')
overlay = Image.new('RGBA', img.size, (0,0,0,0))
draw = ImageDraw.Draw(overlay)

try:
    font = ImageFont.truetype("arial.ttf", 18)
except:
    font = ImageFont.load_default()

colors = {
    '80ft Main road plot': (255, 165, 0, 100),
    '60ft corner plot': (0, 0, 255, 100),
    '30ft corner plot': (128, 0, 128, 100),
    'Normal plot': (0, 200, 0, 60),
    'OFC': (220, 38, 38, 150),
    'Commercial plot': (255, 215, 0, 150),
}

for p in data:
    cx, cy, w, h = p['cx'], p['cy'], p['w'], p['h']
    hw = w * mult / 2
    hh = h * mult / 2
    x0, y0 = cx - hw, cy - hh
    x1, y1 = cx + hw, cy + hh
    color = colors.get(p['type'], (128,128,128,60))
    # Fill
    draw.rectangle([x0, y0, x1, y1], fill=color)
    # Outline
    draw.rectangle([x0, y0, x1, y1], outline=(0,0,0,200), width=1)

# Composite
img_rgba = img.convert('RGBA')
result = Image.alpha_composite(img_rgba, overlay).convert('RGB')

# Crop key regions for verification
# Region 1: Block A (bottom of map) - around y 2700-3100, full width
img_w, img_h = result.size
print(f"Full map size: {img_w} x {img_h}")

# Crop commercial area 
com_area = result.crop((900, 2650, 1800, 3100))
com_area.save('scratch/verify_hitbox_commercial.jpg', quality=90)
print("Saved scratch/verify_hitbox_commercial.jpg")

# Crop Block A road plots
a_area = result.crop((0, 2800, 2000, 3200))
a_area.save('scratch/verify_hitbox_block_a_road.jpg', quality=90)
print("Saved scratch/verify_hitbox_block_a_road.jpg")

# Crop Block B road plots (top)
b_area = result.crop((1400, 2600, 2800, 3100))
b_area.save('scratch/verify_hitbox_block_b_road.jpg', quality=90)
print("Saved scratch/verify_hitbox_block_b_road.jpg")

# Full map downscaled
small = result.copy()
small.thumbnail((1200, 1800))
small.save('scratch/verify_hitbox_full_small.jpg', quality=85)
print("Saved scratch/verify_hitbox_full_small.jpg")

print("Done!")
