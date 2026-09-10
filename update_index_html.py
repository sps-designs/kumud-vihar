import json, re, math
from PIL import Image, ImageDraw, ImageFont

f = open('app.js', encoding='utf-8').read()
m = re.search(r'const globalPlots = (\[.*?\]);', f, re.DOTALL)
data = json.loads(m.group(1))

# From sandbox analysis:
# - Text label bounding box w ~ 25.89px (at 3x zoom)
# - Regular plot width: 30' plot = ~75px (2.5px per foot at 3x zoom)
# - Regular plot height: 65' plot = ~162px
# - The text label mult of 3.5 gives ~90px wide x ~145px tall ≈ close to real plot
#   This is actually quite accurate for regular plots
#
# The PROBLEM: Commercial plots have w/h set to actual dimensions (90*3=270, 120*3=360)
#   which then gets * 3.5 = 945px wide. FIX: reset commercial w/h to normal label size.
#
# Also from visual: some hitboxes are slightly offset vertically.
# We'll use per-plot-type calibrated sizes:

# Calibration (based on 2.5 px/ft at 3x zoom):
# - Normal 30' = 75px wide, 65' = 162px tall → multiplier from label_w(25px): ~3x w, ~6x h
# - 80ft road: 30' wide plots = 75px, 65' tall = same
# - Commercial: use actual PDF footprint in pixels

PLOT_HITBOX_W = {
    '80ft Main road plot': 80,
    '60ft corner plot': 80,
    '30ft corner plot': 80,
    'Normal plot': 80,
    'OFC': 80,
    'Commercial plot': 240,   # ~80-90' wide = ~200-225px; use 240 as safe
}
PLOT_HITBOX_H = {
    '80ft Main road plot': 165,
    '60ft corner plot': 165,
    '30ft corner plot': 165,
    'Normal plot': 155,
    'OFC': 155,
    'Commercial plot': 360,   # 120' deep = 300px; use 360
}

areas_html = ""
for p in data:
    cx = p['cx']
    cy = p['cy']
    plot_type = p['type']
    
    w = PLOT_HITBOX_W.get(plot_type, 80)
    h = PLOT_HITBOX_H.get(plot_type, 155)
    
    # Special override for commercial: use their actual stored w/h which are exact pixel footprints
    if plot_type == 'Commercial plot':
        # Use the actual plot dimensions: COM-1 90'=225px wide, COM-2 80'=200px wide; height 120'=300px
        w = p['w']   # Already: COM-1=270, COM-2=240 (set in generate script)
        h = p['h']   # Already: 360px
        # But these are the actual plot size NOT text label - no extra multiplier needed
    
    x0 = cx - w / 2
    y0 = cy - h / 2
    x1 = cx + w / 2
    y1 = cy + h / 2

    pid = p['plotNo']
    coords = f"{x0:.0f},{y0:.0f},{x1:.0f},{y0:.0f},{x1:.0f},{y1:.0f},{x0:.0f},{y1:.0f}"
    areas_html += f'                    <area target="" alt="{pid}" title="{pid}" href="#" coords="{coords}" shape="poly" onclick="handlePlotClick(event, \'{pid}\')">\n'

map_html = f"""
                <div style="position: relative; display: inline-block; width: fit-content; margin: 0 auto; box-shadow: 0 4px 12px rgba(0,0,0,0.1); border-radius: 8px; overflow: hidden; background: #fff;">
                    <img src="Full_Map.jpg" usemap="#image-map-full" style="display: block; max-width: none;">
                    <map name="image-map-full" id="image-map-coords-full">
{areas_html}                    </map>
                </div>
"""

with open('index.html', 'r', encoding='utf-8') as f_html:
    html = f_html.read()

start = html.find('<div class="map-container glass-panel"')
end = html.find('<!-- Plot Details Pop-up')

if start != -1 and end != -1:
    new_html = (html[:start] +
                '<div class="map-container glass-panel" style="overflow: auto; max-height: 80vh; padding: 20px; text-align: center;">\n' +
                map_html +
                '\n                </div>\n            </div>\n        </main>\n    </div>\n\n    ' +
                html[end:])
    with open('index.html', 'w', encoding='utf-8') as f_html:
        f_html.write(new_html)
    print(f"Updated index.html with calibrated hitboxes for {len(data)} plots")
else:
    print("ERROR: Could not find boundaries")

# ===== Visual sandbox re-verification =====
print("Generating verification images with calibrated hitboxes...")
img = Image.open('Full_Map.jpg').convert('RGB')
overlay = Image.new('RGBA', img.size, (0,0,0,0))
draw = ImageDraw.Draw(overlay)

colors = {
    '80ft Main road plot': (255, 140, 0, 100),
    '60ft corner plot': (30, 30, 255, 100),
    '30ft corner plot': (150, 0, 200, 100),
    'Normal plot': (0, 180, 0, 60),
    'OFC': (220, 38, 38, 150),
    'Commercial plot': (255, 215, 0, 140),
}

for p in data:
    cx, cy = p['cx'], p['cy']
    plot_type = p['type']
    w = PLOT_HITBOX_W.get(plot_type, 80)
    h = PLOT_HITBOX_H.get(plot_type, 155)
    if plot_type == 'Commercial plot':
        w = p['w']
        h = p['h']
    x0, y0, x1, y1 = cx-w/2, cy-h/2, cx+w/2, cy+h/2
    color = colors.get(plot_type, (128,128,128,60))
    draw.rectangle([x0,y0,x1,y1], fill=color)
    draw.rectangle([x0,y0,x1,y1], outline=(0,0,0,200), width=1)

img_rgba = img.convert('RGBA')
result = Image.alpha_composite(img_rgba, overlay).convert('RGB')

# Commercial zoom
result.crop((800, 2650, 1900, 3100)).save('scratch/verify2_commercial.jpg', quality=90)
# Block A road
result.crop((0, 2780, 2000, 3250)).save('scratch/verify2_block_a.jpg', quality=90)
# Full small
small = result.copy()
small.thumbnail((1000, 1500))
small.save('scratch/verify2_full.jpg', quality=85)
print("Verification images saved.")
