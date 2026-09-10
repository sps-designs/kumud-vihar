import json
import re

with open('scratch/blocks.json', encoding='utf-8') as f:
    blocks = json.load(f)

plots = []
areas = []

prefixes = [b for b in blocks if b['text'].strip() in ['A-', 'B-', 'C-', 'D-', 'E-']]
commercials = [b for b in blocks if b['text'].strip() == 'COMMERCIAL']
numbers = [b for b in blocks if b['text'].strip().isdigit()]
sizes = [b for b in blocks if b['text'].strip().replace('.', '', 1).isdigit() and '.' in b['text']]

used_numbers = set()

ofc_plots = {'B-15', 'C-54', 'D-67', 'D-68', 'D-69'}
overlays = []

size_map = {
    "88.89": "20x40",
    "100.00": "30x30",
    "111.11": "25x40",
    "125.00": "25x45",
    "133.33": "30x40",
    "138.89": "25x50",
    "150.00": "30x45",
    "166.67": "30x50",
    "177.78": "32x50",
    "183.33": "30x55",
    "194.44": "35x50",
    "200.00": "30x60",
    "212.89": "Irregular",
    "216.67": "30x65",
    "222.22": "40x50",
    "294.56": "Irregular",
    "1066.67": "80x120",
    "1200.00": "90x120"
}

# Process Commercials FIRST without stealing numbers
com_idx = 1
for p in commercials:
    name = f'COM-{com_idx}'
    plot_type = 'Commercial plot'
    gaj = "1066.67" if com_idx == 1 else "1200.00"
    
    cx, cy = p['cx'], p['cy']
    # Scale width and height based on real dimensions (factor ~2.1 for slightly smaller box)
    dims = size_map.get(gaj, "80x120").split('x')
    w = float(dims[0]) * 2.1 if len(dims) == 2 else 170
    h = float(dims[1]) * 2.1 if len(dims) == 2 else 250
    
    x0, y0, x1, y1 = cx-w/2, cy-h/2, cx+w/2, cy+h/2
    coords = f"{x0:.0f},{y0:.0f},{x1:.0f},{y0:.0f},{x1:.0f},{y1:.0f},{x0:.0f},{y1:.0f}"
    
    plots.append({
        "colonyId": "Colony_1",
        "plotNo": name,
        "size": size_map.get(gaj, "Variable"),
        "gaj": gaj,
        "type": plot_type,
        "status": "available"
    })
    areas.append(f'<area alt="{name}" title="{name}" href="#" coords="{coords}" shape="poly" onclick="handleMapClick(event, \'{name}\')">')
    com_idx += 1

for p in prefixes:
    # find closest unused number
    closest_n = None
    min_dist = 999999
    
    for i, n in enumerate(numbers):
        if i in used_numbers: continue
        dx = p['cx'] - n['cx']
        dy = n['cy'] - p['cy'] 
        
        # Numbers are typically directly below or above the prefix in the same column
        if abs(dy) < 150 and abs(dx) < 40:
            dist = dx*dx + dy*dy
            if dist < min_dist:
                min_dist = dist
                closest_n = (i, n)
                
    if closest_n:
        n_idx, n = closest_n
        used_numbers.add(n_idx)
        
        name = p['text'].replace('-', '') + '-' + n['text']
        
        # Corner definitions
        corner_60 = {
            'A': [33, 56, 57, 80],
            'B': [29, 30, 49, 50, 63, 64, 76, 77, 82, 83],
            'D': [7, 8, 21, 22, 31, 45, 46, 59, 60]
        }
        corner_30 = {
            'A': [9, 24, 38, 51, 39, 50, 44, 45, 68, 69, 63, 74, 62, 65, 75, 10, 23],
            'C': [6, 8, 19, 20, 31, 32, 42, 44, 71, 62, 61, 55, 49, 50, 52, 51],
            'D': [67]
        }
        
        # Determine type based on user rules
        num_val = int(n['text'])
        prefix_char = name[0] # 'A', 'B', etc.
        
        if name.startswith('A-') and 1 <= num_val <= 10:
            plot_type = '80ft Main road plot'
        elif name.startswith('B-') and 1 <= num_val <= 9:
            plot_type = '80ft Main road plot'
        elif prefix_char in corner_60 and num_val in corner_60[prefix_char]:
            plot_type = '60ft corner plot'
        elif prefix_char in corner_30 and num_val in corner_30[prefix_char]:
            plot_type = '30ft corner plot'
        else:
            plot_type = 'Normal plot'
            
        # Find closest size
        closest_s = None
        s_dist = 999999
        for s in sizes:
            dx = p['cx'] - s['cx']
            dy = s['cy'] - p['cy']
            # Enforce strict vertical alignment for individual size extraction
            if abs(dy) < 100 and abs(dx) < 30:
                dist = dx*dx + dy*dy
                if dist < s_dist:
                    s_dist = dist
                    closest_s = s
        
        gaj = closest_s['text'] if closest_s else "150.00"
        
        # Determine actual dimensions
        actual_size = size_map.get(gaj, "Irregular")
        dims = actual_size.split('x')
        
        # Calculate a much tighter clickable area proportional to real dimensions
        cx = (p['cx'] + n['cx']) / 2
        cy = (p['cy'] + n['cy']) / 2
        
        if len(dims) == 2:
            w = float(dims[0]) * 2.1
            h = float(dims[1]) * 2.1
        else:
            w = 70
            h = 100
            
        x0, y0, x1, y1 = cx-w/2, cy-h/2, cx+w/2, cy+h/2
        coords = f"{x0:.0f},{y0:.0f},{x1:.0f},{y0:.0f},{x1:.0f},{y1:.0f},{x0:.0f},{y1:.0f}"
        
        if name in ofc_plots:
            plot_type = 'OFC'
            status_val = 'OFC'
            overlays.append(f'<div style="position: absolute; left: {cx:.0f}px; top: {cy:.0f}px; transform: translate(-50%, -50%); color: red; font-weight: bold; font-size: 28px; pointer-events: none; text-shadow: -1px -1px 0 #fff, 1px -1px 0 #fff, -1px 1px 0 #fff, 1px 1px 0 #fff; z-index: 10;">OFC</div>')
        else:
            status_val = 'available'
            
        plots.append({
            "colonyId": "Colony_1",
            "plotNo": name,
            "size": actual_size,
            "gaj": gaj,
            "type": plot_type,
            "status": status_val
        })
        areas.append(f'<area alt="{name}" title="{name}" href="#" coords="{coords}" shape="poly" onclick="handleMapClick(event, \'{name}\')">')

print(f"Extracted {len(plots)} accurate plots")

# Now Patch app.js
plots_js = json.dumps(plots, indent=4)
areas_html = "\n".join("                        " + a for a in areas)

with open('app.js', 'r', encoding='utf-8') as f:
    app_js = f.read()

app_js = re.sub(
    r'const globalPlots = \[.*?\];', 
    f'const globalPlots = {plots_js};', 
    app_js, 
    flags=re.DOTALL
)

with open('app.js', 'w', encoding='utf-8') as f:
    f.write(app_js)

# Patch index.html map areas
with open('index.html', 'r', encoding='utf-8') as f:
    index_html = f.read()

# Replace the map element internals and add overlays wrapper
overlays_str = "\n".join(overlays)
map_html = f"""<div id="map-wrapper" style="position: relative; display: inline-block; padding: 0; margin: 0;">
                        <img id="colony-map-img" src="map.jpg" usemap="#image-map" alt="Colony Master Plan" style="display: block;">
                        <map name="image-map" id="image-map-coords">
{areas_html}
                        </map>
                        {overlays_str}
                    </div>"""

index_html = re.sub(
    r'<img id="colony-map-img" src="map.jpg" usemap="#image-map" alt="Colony Master Plan" style="display: block;">.*?<map name="image-map" id="image-map-coords">.*?</map>',
    map_html,
    index_html,
    flags=re.DOTALL
)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(index_html)

print("Successfully patched app.js and index.html with improved map areas and data.")
