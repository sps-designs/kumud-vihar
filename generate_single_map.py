import pymupdf
import json
import math
import re
from PIL import Image, ImageDraw, ImageFont

# ============================================================
# CONFIGURATION
# ============================================================

zoom = 3.0
ofc_plots = ['B-15', 'C-54', 'D-67', 'D-68', 'D-69']

# 60ft corner plots
corner60 = set([
    'A-33','A-56','A-57','A-80',
    'B-29','B-30','B-49','B-50','B-63','B-64','B-76','B-77','B-82','B-83',
    'D-7','D-8','D-21','D-22','D-31','D-32','D-45','D-46','D-59','D-60'
])

# 30ft corner plots
corner30 = set([
    'A-9','A-24','A-38','A-51','A-39','A-50','A-44','A-45',
    'A-68','A-69','A-63','A-74','A-62','A-65','A-75','A-10','A-23',
    'C-6','C-8','C-19','C-20','C-31','C-32','C-42','C-44',
    'C-71','C-62','C-61','C-55','C-49','C-50','C-52','C-51',
    'D-67'
])

# 80ft main road (A-1 to A-10, B-1 to B-7)
main80 = set([f'A-{i}' for i in range(1, 11)] + [f'B-{i}' for i in range(1, 8)])
# NOTE: D-67 is BOTH 30ft corner AND OFC - OFC takes priority
# NOTE: A-9, A-10 are in corner30 list but 80ft main road takes priority here

# Commercial plots - dimensions extracted directly from PDF labels
# COM-1: 'COMMERCIAL' at (511.2, 938.6), size=1200 Sq.Yds., 90' wide x 120' deep
# COM-2: 'COMMERCIAL' at (386.4, 938.6), size=1066.67 Sq.Yds., 80' wide x 120' deep
COMMERCIAL_PLOTS = [
    {
        "plotNo": "COM-1",
        "colonyId": "Colony_1",
        "block": "COM",
        "type": "Commercial plot",
        "gaj": "1200.00",
        "size": "1200.00",
        "status": "Available",
        "price": "",
        "cx": round(511.2 * zoom, 2),
        "cy": round(945.0 * zoom, 2),
        "w": round(90 * zoom, 2),
        "h": round(120 * zoom, 2),
        "dims": "90' x 120'"
    },
    {
        "plotNo": "COM-2",
        "colonyId": "Colony_1",
        "block": "COM",
        "type": "Commercial plot",
        "gaj": "1066.67",
        "size": "1066.67",
        "status": "Available",
        "price": "",
        "cx": round(386.4 * zoom, 2),
        "cy": round(945.0 * zoom, 2),
        "w": round(80 * zoom, 2),
        "h": round(120 * zoom, 2),
        "dims": "80' x 120'"
    }
]

# ============================================================
# STEP 1: Extract exact plot word bboxes
# ============================================================
print("Loading vector data...")
with open('scratch/exact_vector_data.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

plots = data['plots']
sizes = data['sizes']

# ============================================================
# STEP 2: Extract foot-dimension labels from PDF
# These are things like "30'", "45'", "25'" near each plot
# ============================================================
print("Extracting dimension labels from PDF...")
doc = pymupdf.open('assests/kumud_vihar_gulabpura.pdf')
page = doc[0]
words = page.get_text('words')

# Foot-dimension words: match pattern like "30'", "45'-6\"" etc.
foot_pattern = re.compile(r"^\d+['\u2019]")
dim_words = []
for w in words:
    txt = w[4].strip()
    if foot_pattern.match(txt):
        cx = (w[0] + w[2]) / 2
        cy = (w[1] + w[3]) / 2
        dim_words.append({"val": txt, "cx": cx, "cy": cy})

print(f"  Found {len(dim_words)} dimension labels")

# ============================================================
# STEP 3: Build processed plots with correct types and dims
# ============================================================
print("Processing plots...")
processed_plots = []

for p in plots:
    cx = p['cx'] * zoom
    cy = p['cy'] * zoom
    w = p['w'] * zoom
    h = p['h'] * zoom

    plot_name = p['name']

    # Find closest size
    closest_s = None
    s_dist = 999999
    for s in sizes:
        s_cx = s['cx'] * zoom
        s_cy = s['cy'] * zoom
        dist = math.sqrt((cx - s_cx)**2 + (cy - s_cy)**2)
        if dist < s_dist and dist < 200:
            s_dist = dist
            closest_s = s
    actual_size = closest_s['size'] if closest_s else "150.00"

    # Find 2 nearest dimension labels (width and depth)
    # Sort by distance from plot center (in native coords)
    p_cx_native = p['cx']
    p_cy_native = p['cy']
    nearby_dims = sorted(dim_words, 
        key=lambda d: math.sqrt((d['cx']-p_cx_native)**2 + (d['cy']-p_cy_native)**2))
    
    # Get 2 closest, pick the 2 unique dimension values
    dim_vals = []
    seen = set()
    for d in nearby_dims[:8]:
        clean = d['val'].split("'")[0].replace("'","").replace("\u2019","")
        # Accept clean numbers only
        if clean.isdigit() and d['val'] not in seen:
            seen.add(d['val'])
            dim_vals.append(clean + "'")
            if len(dim_vals) == 2:
                break
    
    if len(dim_vals) >= 2:
        dims_str = f"{dim_vals[0]} x {dim_vals[1]}"
    elif len(dim_vals) == 1:
        dims_str = dim_vals[0]
    else:
        dims_str = f"{actual_size} Sq.Yds."

    # Determine plot type (priority order: OFC > 80ft main road > 60ft corner > 30ft corner > normal)
    if plot_name in ofc_plots:
        plot_type = 'OFC'
        status_val = 'OFC'
    elif plot_name in main80:
        plot_type = '80ft Main road plot'
        status_val = 'Available'
    elif plot_name in corner60:
        plot_type = '60ft corner plot'
        status_val = 'Available'
    elif plot_name in corner30:
        plot_type = '30ft corner plot'
        status_val = 'Available'
    else:
        plot_type = 'Normal plot'
        status_val = 'Available'

    processed_plots.append({
        "plotNo": plot_name,
        "colonyId": "Colony_1",
        "block": plot_name.split('-')[0],
        "type": plot_type,
        "gaj": actual_size,
        "size": actual_size,
        "dims": dims_str,
        "status": status_val,
        "price": "",
        "cx": round(cx, 2),
        "cy": round(cy, 2),
        "w": round(w, 2),
        "h": round(h, 2)
    })

# Add commercial plots
processed_plots.extend(COMMERCIAL_PLOTS)

# Sort: A first, then B, C, D, COM — and numerically within each block
BLOCK_ORDER = {'A': 0, 'B': 1, 'C': 2, 'D': 3, 'COM': 4}

def sort_key(p):
    parts = p['plotNo'].split('-')
    block = parts[0]
    num = int(parts[1]) if len(parts) > 1 and parts[1].isdigit() else 999
    return (BLOCK_ORDER.get(block, 99), num)

processed_plots.sort(key=sort_key)

print(f"  Total plots: {len(processed_plots)}")

# ============================================================
# STEP 4: Update app.js
# ============================================================
print("Updating app.js...")
js_content = "const globalPlots = " + json.dumps(processed_plots, indent=4) + ";\n"

with open('app.js', 'r', encoding='utf-8') as f:
    app_js = f.read()

new_app_js = re.sub(r'const globalPlots = \[.*?\];\n', js_content + "\n", app_js, flags=re.DOTALL)

# Inject handlePlotClick if missing
if 'handlePlotClick' not in new_app_js:
    handle_fn = """
// Called from <area onclick>
function handlePlotClick(event, plotId) {
    event.preventDefault();
    const plot = globalPlots.find(p => p.plotNo === plotId);
    if (!plot) return;
    const rate = RATES[plot.type] || 0;
    const amount = rate * parseFloat(plot.gaj || plot.size || 150);
    openModal(plot, rate, amount);
}
"""
    new_app_js = new_app_js.replace('function openModal(', handle_fn + '\nfunction openModal(')

with open('app.js', 'w', encoding='utf-8') as f:
    f.write(new_app_js)

print("  app.js updated.")

# ============================================================
# STEP 5: Update openModal to show dims field
# ============================================================
# The modal currently shows plot.size for Dimensions.
# Update it to show plot.dims if available.
with open('app.js', 'r', encoding='utf-8') as f:
    app_js = f.read()

# Fix the Dimensions row in the modal to use dims field
app_js = app_js.replace(
    '${plot.size}',
    '${plot.dims || plot.size}'
).replace(
    # Also fix the detail-row for dimensions - make it cleaner
    'Dimensions</span>\n            <span class="detail-value">${plot.dims || plot.size}',
    'Dimensions</span>\n            <span class="detail-value">${plot.dims || plot.size + \' Sq.Yds.\'}'
)

with open('app.js', 'w', encoding='utf-8') as f:
    f.write(app_js)

print("  Modal Dimensions field updated.")

# ============================================================
# STEP 6: Render map with OFC burned in
# ============================================================
print("Rendering Full_Map.jpg...")
mat = pymupdf.Matrix(zoom, zoom)
pix = page.get_pixmap(matrix=mat)
img_path = 'Full_Map.jpg'
pix.save(img_path)

img = Image.open(img_path)
draw = ImageDraw.Draw(img)

font_size = 28
try:
    font = ImageFont.truetype("arialbd.ttf", font_size)
except:
    try:
        font = ImageFont.truetype("arial.ttf", font_size)
    except:
        font = ImageFont.load_default()

for p in processed_plots:
    if p['plotNo'] in ofc_plots:
        text = "OFC"
        bbox = draw.textbbox((0, 0), text, font=font)
        tw = bbox[2] - bbox[0]
        th = bbox[3] - bbox[1]
        x = p['cx'] - tw / 2
        y = p['cy'] - th / 2
        # White outline
        for dx in range(-2, 3):
            for dy in range(-2, 3):
                draw.text((x + dx, y + dy), text, fill="white", font=font)
        draw.text((x, y), text, fill="red", font=font)
        print(f"  OFC burned at {p['plotNo']} ({x:.0f}, {y:.0f})")

img.save(img_path)
print("Done! Full_Map.jpg saved.")
